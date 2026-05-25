function slugify(value, fallback = "service") {
  return (
    String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || fallback
  );
}

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

function getTechStack(node) {
  if (Array.isArray(node?.techStack)) {
    return node.techStack.filter(Boolean);
  }

  return Array.isArray(node?.data?.techStack) ? node.data.techStack.filter(Boolean) : [];
}

function hasTech(node, matcher) {
  return getTechStack(node).some((item) => matcher(String(item || "").toLowerCase()));
}

function inferRole(node) {
  const type = String(node?.type || "").toLowerCase();

  if (type.includes("front")) {
    return "frontend";
  }

  if (type === "api" || type === "service" || hasTech(node, (item) => item.includes("node") || item.includes("express"))) {
    return "service";
  }

  if (type.includes("database") || hasTech(node, (item) => item.includes("mongo"))) {
    return "database";
  }

  if (type.includes("cache") || hasTech(node, (item) => item.includes("redis"))) {
    return "cache";
  }

  return "service";
}

function inferPort(role) {
  if (role === "frontend") {
    return 3000;
  }

  if (role === "service") {
    return 4000;
  }

  if (role === "database") {
    return 27017;
  }

  if (role === "cache") {
    return 6379;
  }

  return 8080;
}

function createNodeRecord(node, index, nameCounts, roleCounts) {
  const label = node?.data?.label || node?.id || `node-${index + 1}`;
  const role = inferRole(node);
  const techStack = getTechStack(node);
  const baseSlug = slugify(label, `${role}-${index + 1}`);
  const slugCount = (nameCounts.get(baseSlug) || 0) + 1;

  nameCounts.set(baseSlug, slugCount);

  const roleIndex = roleCounts.get(role) || 0;
  roleCounts.set(role, roleIndex + 1);

  const serviceName = slugCount === 1 ? baseSlug : `${baseSlug}-${slugCount}`;
  const terraformName = serviceName.replace(/-/g, "_");
  const containerPort = inferPort(role);
  const hostPort = containerPort + roleIndex;

  return {
    containerPort,
    hostPort,
    id: node.id,
    label,
    role,
    serviceName,
    techStack,
    terraformName,
  };
}

function buildTopology(canvas) {
  const rawNodes = Array.isArray(canvas?.nodes) ? canvas.nodes : [];
  const rawEdges = Array.isArray(canvas?.edges) ? canvas.edges : [];
  const nodeById = new Map(rawNodes.map((node) => [node.id, node]));
  const incomingIds = new Map(rawNodes.map((node) => [node.id, []]));
  const outgoingIds = new Map(rawNodes.map((node) => [node.id, []]));

  rawEdges.forEach((edge) => {
    if (!nodeById.has(edge?.source) || !nodeById.has(edge?.target)) {
      return;
    }

    outgoingIds.get(edge.source).push(edge.target);
    incomingIds.get(edge.target).push(edge.source);
  });

  const nameCounts = new Map();
  const roleCounts = new Map();

  const nodes = rawNodes.map((node, index) => createNodeRecord(node, index, nameCounts, roleCounts));
  const compiledNodeMap = new Map(nodes.map((node) => [node.id, node]));

  const hydratedNodes = nodes.map((node) => {
    const incomingNodes = unique(incomingIds.get(node.id) || []).map((id) => compiledNodeMap.get(id)).filter(Boolean);
    const outgoingNodes = unique(outgoingIds.get(node.id) || []).map((id) => compiledNodeMap.get(id)).filter(Boolean);
    const neighborNodes = unique([...(incomingIds.get(node.id) || []), ...(outgoingIds.get(node.id) || [])])
      .map((id) => compiledNodeMap.get(id))
      .filter(Boolean);

    return {
      ...node,
      incomingNodes,
      neighborNodes,
      outgoingNodes,
    };
  });

  const hydratedNodeMap = new Map(hydratedNodes.map((node) => [node.id, node]));

  const edges = rawEdges
    .map((edge) => ({
      id: edge.id,
      source: hydratedNodeMap.get(edge.source),
      target: hydratedNodeMap.get(edge.target),
    }))
    .filter((edge) => edge.source && edge.target);

  return {
    edges,
    nodes: hydratedNodes,
  };
}

function buildEnvironmentEntries(node) {
  const environment = [];

  if (node.role === "frontend") {
    const firstService = node.outgoingNodes.find((neighbor) => neighbor.role === "service");

    environment.push(["PORT", String(node.containerPort)]);

    if (firstService) {
      environment.push(["VITE_API_BASE_URL", `http://${firstService.serviceName}:${firstService.containerPort}`]);
    }

    return environment;
  }

  if (node.role === "service") {
    const databases = node.neighborNodes.filter((neighbor) => neighbor.role === "database");
    const caches = node.neighborNodes.filter((neighbor) => neighbor.role === "cache");

    environment.push(["PORT", String(node.containerPort)]);

    const mongoDatabase = databases.find((database) => hasTech({ data: { techStack: database.techStack } }, (item) => item.includes("mongo")));

    if (mongoDatabase) {
      environment.push([
        "MONGO_URI",
        `mongodb://${mongoDatabase.serviceName}:${mongoDatabase.containerPort}/${slugify(mongoDatabase.label, "app")}`,
      ]);
    }

    const redisCache = caches.find((cache) => hasTech({ data: { techStack: cache.techStack } }, (item) => item.includes("redis")));

    if (redisCache) {
      environment.push(["REDIS_URL", `redis://${redisCache.serviceName}:${redisCache.containerPort}`]);
    }

    if (databases.length > 1) {
      environment.push(["DATABASE_SERVICES", databases.map((database) => database.serviceName).join(",")]);
    }

    if (caches.length > 1) {
      environment.push(["CACHE_SERVICES", caches.map((cache) => cache.serviceName).join(",")]);
    }

    return environment;
  }

  if (node.role === "database" && hasTech(node, (item) => item.includes("mongo"))) {
    environment.push(["MONGO_INITDB_DATABASE", slugify(node.label, "app")]);
    return environment;
  }

  return environment;
}

function buildDependsOn(node) {
  if (node.role === "frontend") {
    return unique(node.outgoingNodes.filter((neighbor) => neighbor.role === "service").map((neighbor) => neighbor.serviceName));
  }

  if (node.role === "service") {
    return unique(
      node.neighborNodes
        .filter((neighbor) => neighbor.role === "database" || neighbor.role === "cache")
        .map((neighbor) => neighbor.serviceName),
    );
  }

  return [];
}

function buildComposeServiceBlock(node) {
  const environment = buildEnvironmentEntries(node);
  const dependsOn = buildDependsOn(node);
  const lines = [`  ${node.serviceName}:`];

  if (node.role === "database") {
    lines.push("    image: mongo:7");
    lines.push("    container_name: " + node.serviceName);
    lines.push("    restart: unless-stopped");
    if (environment.length) {
      lines.push("    environment:");
      environment.forEach(([key, value]) => {
        lines.push(`      ${key}: \"${value}\"`);
      });
    }
    lines.push("    volumes:");
    lines.push(`      - ${node.serviceName}-data:/data/db`);
    lines.push("    ports:");
    lines.push(`      - \"${node.hostPort}:${node.containerPort}\"`);
    lines.push("    networks:");
    lines.push("      - synapse");
    return lines;
  }

  if (node.role === "cache") {
    lines.push("    image: redis:7-alpine");
    lines.push("    container_name: " + node.serviceName);
    lines.push("    restart: unless-stopped");
    lines.push('    command: "redis-server --appendonly yes"');
    lines.push("    ports:");
    lines.push(`      - \"${node.hostPort}:${node.containerPort}\"`);
    lines.push("    networks:");
    lines.push("      - synapse");
    return lines;
  }

  lines.push("    build:");
  lines.push(`      context: ./${node.serviceName}`);
  lines.push("      dockerfile: Dockerfile");
  lines.push("    container_name: " + node.serviceName);
  lines.push("    restart: unless-stopped");

  if (environment.length) {
    lines.push("    environment:");
    environment.forEach(([key, value]) => {
      lines.push(`      ${key}: \"${value}\"`);
    });
  }

  if (dependsOn.length) {
    lines.push("    depends_on:");
    dependsOn.forEach((serviceName) => {
      lines.push(`      - ${serviceName}`);
    });
  }

  lines.push("    ports:");
  lines.push(`      - \"${node.hostPort}:${node.containerPort}\"`);
  lines.push("    networks:");
  lines.push("      - synapse");

  return lines;
}

function renderDockerCompose(canvas, topology) {
  const title = canvas?.title || "Untitled Canvas";

  if (!topology.nodes.length) {
    return [
      `# Synapse Docker Compose blueprint for ${title}`,
      "services: {}",
      "networks:",
      "  synapse:",
      "    driver: bridge",
    ].join("\n");
  }

  const lines = [`# Synapse Docker Compose blueprint for ${title}`, "services:"];

  topology.nodes.forEach((node) => {
    lines.push(...buildComposeServiceBlock(node));
  });

  lines.push("", "networks:", "  synapse:", "    driver: bridge");

  const mongoNodes = topology.nodes.filter((node) => node.role === "database" && hasTech(node, (item) => item.includes("mongo")));

  if (mongoNodes.length) {
    lines.push("", "volumes:");
    mongoNodes.forEach((node) => {
      lines.push(`  ${node.serviceName}-data:`);
    });
  }

  return lines.join("\n");
}

function renderTerraformResource(node) {
  const environment = buildEnvironmentEntries(node);
  const dependsOn = buildDependsOn(node);
  const lines = [];

  if (node.role === "database") {
    lines.push(`resource \"docker_volume\" \"${node.terraformName}_data\" {`);
    lines.push(`  name = \"${node.serviceName}-data\"`);
    lines.push("}", "");
  }

  lines.push(`resource \"docker_image\" \"${node.terraformName}\" {`);

  if (node.role === "database") {
    lines.push('  name         = "mongo:7"');
    lines.push("  keep_locally = true");
  } else if (node.role === "cache") {
    lines.push('  name         = "redis:7-alpine"');
    lines.push("  keep_locally = true");
  } else {
    lines.push(`  name = \"${node.serviceName}:latest\"`);
    lines.push("  build {");
    lines.push(`    context    = \"./${node.serviceName}\"`);
    lines.push('    dockerfile = "Dockerfile"');
    lines.push("  }");
  }

  lines.push("}", "");
  lines.push(`resource \"docker_container\" \"${node.terraformName}\" {`);
  lines.push(`  name  = \"${node.serviceName}\"`);
  lines.push(`  image = docker_image.${node.terraformName}.image_id`);
  lines.push('  restart = "unless-stopped"');

  if (node.role === "cache") {
    lines.push('  command = ["redis-server", "--appendonly", "yes"]');
  }

  if (environment.length) {
    lines.push("  env = [");
    environment.forEach(([key, value]) => {
      lines.push(`    \"${key}=${value}\",`);
    });
    lines.push("  ]");
  }

  if (dependsOn.length) {
    lines.push("  depends_on = [");
    dependsOn.forEach((serviceName) => {
      lines.push(`    docker_container.${serviceName.replace(/-/g, "_")},`);
    });
    lines.push("  ]");
  }

  lines.push("  ports {");
  lines.push(`    internal = ${node.containerPort}`);
  lines.push(`    external = ${node.hostPort}`);
  lines.push("  }");
  lines.push("  networks_advanced {");
  lines.push("    name = docker_network.synapse.name");
  lines.push("  }");

  if (node.role === "database") {
    lines.push("  volumes {");
    lines.push(`    volume_name    = docker_volume.${node.terraformName}_data.name`);
    lines.push('    container_path = "/data/db"');
    lines.push("  }");
  }

  lines.push("}");

  return lines.join("\n");
}

function renderTerraformBlueprint(canvas, topology) {
  const title = canvas?.title || "Untitled Canvas";
  const lines = [
    `# Synapse Terraform blueprint for ${title}`,
    "terraform {",
    "  required_providers {",
    '    docker = {',
    '      source  = "kreuzwerker/docker"',
    '      version = "~> 3.0"',
    "    }",
    "  }",
    "}",
    "",
    'provider "docker" {}',
    "",
    'resource "docker_network" "synapse" {',
    '  name = "synapse"',
    "}",
  ];

  if (!topology.nodes.length) {
    lines.push("", "# No nodes are present on this canvas yet.");
    return lines.join("\n");
  }

  topology.nodes.forEach((node) => {
    lines.push("", renderTerraformResource(node));
  });

  return lines.join("\n");
}

export function compileBlueprints(canvas) {
  const normalizedCanvas = {
    edges: Array.isArray(canvas?.edges) ? canvas.edges : [],
    nodes: Array.isArray(canvas?.nodes) ? canvas.nodes : [],
    title: canvas?.title || "Untitled Canvas",
  };
  const topology = buildTopology(normalizedCanvas);

  return {
    dockerCompose: renderDockerCompose(normalizedCanvas, topology),
    terraform: renderTerraformBlueprint(normalizedCanvas, topology),
    topology,
  };
}