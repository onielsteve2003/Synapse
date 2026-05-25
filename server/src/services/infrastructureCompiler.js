function slugify(value) {
  return String(value || "service")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "service";
}

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

function getTechStack(node) {
  return Array.isArray(node?.data?.techStack) ? node.data.techStack.filter(Boolean) : [];
}

function inferRole(node) {
  const type = String(node?.type || "").toLowerCase();
  const techStack = getTechStack(node).map((item) => item.toLowerCase());

  if (type.includes("front")) {
    return "frontend";
  }

  if (
    type === "api" ||
    type === "service" ||
    techStack.some((item) => item.includes("express") || item.includes("node"))
  ) {
    return "service";
  }

  if (
    type.includes("database") ||
    techStack.some(
      (item) => item.includes("mongo") || item.includes("postgres") || item.includes("mysql"),
    )
  ) {
    return "database";
  }

  if (type.includes("cache") || techStack.some((item) => item.includes("redis"))) {
    return "cache";
  }

  return "service";
}

function inferDatabaseFlavor(techStack) {
  const normalized = techStack.map((item) => item.toLowerCase());

  if (normalized.some((item) => item.includes("postgres"))) {
    return "postgres";
  }

  if (normalized.some((item) => item.includes("mysql"))) {
    return "mysql";
  }

  return "mongo";
}

function inferContainerPort(role, techStack) {
  if (role === "frontend") {
    return 3000;
  }

  if (role === "service") {
    return 4000;
  }

  if (role === "cache") {
    return 6379;
  }

  if (role === "database") {
    const flavor = inferDatabaseFlavor(techStack);

    if (flavor === "postgres") {
      return 5432;
    }

    if (flavor === "mysql") {
      return 3306;
    }

    return 27017;
  }

  return 8080;
}

function inferImage(role, techStack) {
  if (role === "frontend" || role === "service") {
    return "node:20-alpine";
  }

  if (role === "cache") {
    return "redis:7-alpine";
  }

  if (role === "database") {
    const flavor = inferDatabaseFlavor(techStack);

    if (flavor === "postgres") {
      return "postgres:16-alpine";
    }

    if (flavor === "mysql") {
      return "mysql:8.4";
    }

    return "mongo:7";
  }

  return "alpine:3.20";
}

function getPersistentVolumePath(role, techStack) {
  if (role !== "database") {
    return null;
  }

  const flavor = inferDatabaseFlavor(techStack);

  if (flavor === "postgres") {
    return "/var/lib/postgresql/data";
  }

  if (flavor === "mysql") {
    return "/var/lib/mysql";
  }

  return "/data/db";
}

function quoteYaml(value) {
  return `"${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function createComposeCommand(node) {
  if (node.role === "cache") {
    return "redis-server --appendonly yes";
  }

  if (node.role === "frontend" || node.role === "service") {
    return `sh -c \"echo 'Mount the ${node.label} source code into /workspace and replace this command with the real startup task.' && tail -f /dev/null\"`;
  }

  return null;
}

function buildDependsOn(node, outgoingNodes, neighborNodes) {
  if (node.role === "frontend") {
    return unique(outgoingNodes.filter((item) => item.role === "service").map((item) => item.serviceName));
  }

  if (node.role === "service") {
    return unique(
      neighborNodes
        .filter((item) => item.role === "service" || item.role === "database" || item.role === "cache")
        .map((item) => item.serviceName),
    );
  }

  return [];
}

function buildEnvironment(node, outgoingNodes, incomingNodes, neighborNodes) {
  const environment = [];

  if (node.role === "frontend") {
    const connectedServices = outgoingNodes.filter((item) => item.role === "service");

    environment.push(["PORT", String(node.containerPort)]);

    if (connectedServices[0]) {
      environment.push([
        "VITE_API_BASE_URL",
        `http://${connectedServices[0].serviceName}:${connectedServices[0].containerPort}`,
      ]);
    }

    if (connectedServices.length > 1) {
      environment.push([
        "UPSTREAM_API_SERVICES",
        connectedServices.map((item) => item.serviceName).join(","),
      ]);
    }

    return environment;
  }

  if (node.role === "service") {
    const databases = neighborNodes.filter((item) => item.role === "database");
    const caches = neighborNodes.filter((item) => item.role === "cache");
    const frontends = incomingNodes.filter((item) => item.role === "frontend");

    environment.push(["PORT", String(node.containerPort)]);

    const mongoDatabase = databases.find(
      (item) => inferDatabaseFlavor(item.techStack) === "mongo",
    );

    if (mongoDatabase) {
      environment.push([
        "MONGODB_URI",
        `mongodb://${mongoDatabase.serviceName}:${mongoDatabase.containerPort}/${slugify(node.label)}`,
      ]);
    }

    const postgresDatabase = databases.find(
      (item) => inferDatabaseFlavor(item.techStack) === "postgres",
    );

    if (postgresDatabase) {
      environment.push([
        "POSTGRES_URL",
        `postgres://app:app@${postgresDatabase.serviceName}:${postgresDatabase.containerPort}/${slugify(node.label)}`,
      ]);
    }

    const mysqlDatabase = databases.find(
      (item) => inferDatabaseFlavor(item.techStack) === "mysql",
    );

    if (mysqlDatabase) {
      environment.push([
        "MYSQL_URL",
        `mysql://app:app@${mysqlDatabase.serviceName}:${mysqlDatabase.containerPort}/${slugify(node.label)}`,
      ]);
    }

    if (databases.length > 1) {
      environment.push([
        "DATABASE_SERVICES",
        databases.map((item) => item.serviceName).join(","),
      ]);
    }

    if (caches[0]) {
      environment.push([
        "REDIS_URL",
        `redis://${caches[0].serviceName}:${caches[0].containerPort}`,
      ]);
    }

    if (frontends.length) {
      environment.push([
        "CLIENT_ORIGINS",
        frontends
          .map((item) => `http://${item.serviceName}:${item.containerPort}`)
          .join(","),
      ]);
    }

    return environment;
  }

  if (node.role === "database") {
    const flavor = inferDatabaseFlavor(node.techStack);

    if (flavor === "mongo") {
      environment.push(["MONGO_INITDB_DATABASE", slugify(node.label)]);
    }

    if (flavor === "postgres") {
      environment.push(["POSTGRES_DB", slugify(node.label)]);
      environment.push(["POSTGRES_USER", "app"]);
      environment.push(["POSTGRES_PASSWORD", "app"]);
    }

    if (flavor === "mysql") {
      environment.push(["MYSQL_DATABASE", slugify(node.label)]);
      environment.push(["MYSQL_USER", "app"]);
      environment.push(["MYSQL_PASSWORD", "app"]);
      environment.push(["MYSQL_ROOT_PASSWORD", "root"]);
    }

    return environment;
  }

  return environment;
}

function buildTopology(canvas) {
  const rawNodes = Array.isArray(canvas?.nodes) ? canvas.nodes : [];
  const rawEdges = Array.isArray(canvas?.edges) ? canvas.edges : [];
  const rawNodeMap = new Map(rawNodes.map((node) => [node.id, node]));
  const incomingIds = new Map(rawNodes.map((node) => [node.id, []]));
  const outgoingIds = new Map(rawNodes.map((node) => [node.id, []]));

  const validEdges = rawEdges.filter(
    (edge) => rawNodeMap.has(edge?.source) && rawNodeMap.has(edge?.target),
  );

  validEdges.forEach((edge) => {
    outgoingIds.get(edge.source).push(edge.target);
    incomingIds.get(edge.target).push(edge.source);
  });

  const serviceNameCounts = new Map();
  const roleCounts = new Map();

  const preliminaryNodes = rawNodes.map((node) => {
    const label = node?.data?.label || node.id;
    const role = inferRole(node);
    const techStack = getTechStack(node);
    const baseServiceName = slugify(label);
    const nextServiceNameCount = (serviceNameCounts.get(baseServiceName) || 0) + 1;
    serviceNameCounts.set(baseServiceName, nextServiceNameCount);

    const roleIndex = roleCounts.get(role) || 0;
    roleCounts.set(role, roleIndex + 1);

    const containerPort = inferContainerPort(role, techStack);

    return {
      id: node.id,
      label,
      role,
      type: node.type || role,
      techStack,
      serviceName:
        nextServiceNameCount === 1 ? baseServiceName : `${baseServiceName}-${nextServiceNameCount}`,
      containerPort,
      hostPort: containerPort + roleIndex,
      incomingIds: unique(incomingIds.get(node.id) || []),
      outgoingIds: unique(outgoingIds.get(node.id) || []),
    };
  });

  const preliminaryNodeMap = new Map(preliminaryNodes.map((node) => [node.id, node]));

  const nodes = preliminaryNodes.map((node) => {
    const outgoingNodes = node.outgoingIds
      .map((id) => preliminaryNodeMap.get(id))
      .filter(Boolean);
    const incomingNodes = node.incomingIds
      .map((id) => preliminaryNodeMap.get(id))
      .filter(Boolean);
    const neighborNodes = unique([...node.outgoingIds, ...node.incomingIds])
      .map((id) => preliminaryNodeMap.get(id))
      .filter(Boolean);

    return {
      ...node,
      image: inferImage(node.role, node.techStack),
      dependsOn: buildDependsOn(node, outgoingNodes, neighborNodes),
      environment: buildEnvironment(node, outgoingNodes, incomingNodes, neighborNodes),
      incomingNodes,
      outgoingNodes,
      neighborNodes,
    };
  });

  const nodeMap = new Map(nodes.map((node) => [node.id, node]));

  return {
    nodes,
    edges: validEdges
      .map((edge) => ({
        id: edge.id,
        source: nodeMap.get(edge.source),
        target: nodeMap.get(edge.target),
      }))
      .filter((edge) => edge.source && edge.target),
  };
}

function renderServiceBlock(node) {
  const lines = [
    `  ${node.serviceName}:`,
    `    image: ${node.image}`,
    `    container_name: ${node.serviceName}`,
    "    restart: unless-stopped",
  ];

  if (node.role === "frontend" || node.role === "service") {
    lines.push("    working_dir: /workspace");
  }

  const command = createComposeCommand(node);

  if (command) {
    lines.push(`    command: ${quoteYaml(command)}`);
  }

  if (node.environment.length) {
    lines.push("    environment:");
    node.environment.forEach(([key, value]) => {
      lines.push(`      ${key}: ${quoteYaml(value)}`);
    });
  }

  if (node.dependsOn.length) {
    lines.push("    depends_on:");
    node.dependsOn.forEach((serviceName) => {
      lines.push(`      - ${serviceName}`);
    });
  }

  lines.push("    ports:");
  lines.push(`      - ${quoteYaml(`${node.hostPort}:${node.containerPort}`)}`);
  lines.push("    networks:");
  lines.push("      - synapse");

  const volumePath = getPersistentVolumePath(node.role, node.techStack);

  if (volumePath) {
    lines.push("    volumes:");
    lines.push(`      - ${node.serviceName}-data:${volumePath}`);
  }

  return lines;
}

function renderDockerCompose(canvas, topology) {
  if (!topology.nodes.length) {
    return [
      `# Generated by Synapse for ${canvas.title || "Untitled Canvas"}`,
      "services: {}",
      "networks:",
      "  synapse:",
      "    driver: bridge",
    ].join("\n");
  }

  const lines = [`# Generated by Synapse for ${canvas.title || "Untitled Canvas"}`, "services:"];

  topology.nodes.forEach((node) => {
    lines.push(...renderServiceBlock(node));
  });

  lines.push("", "networks:", "  synapse:", "    driver: bridge");

  const persistentNodes = topology.nodes.filter((node) => getPersistentVolumePath(node.role, node.techStack));

  if (persistentNodes.length) {
    lines.push("", "volumes:");
    persistentNodes.forEach((node) => {
      lines.push(`  ${node.serviceName}-data:`);
    });
  }

  return lines.join("\n");
}

function renderArchitectureMarkdown(canvas, topology) {
  const frontends = topology.nodes.filter((node) => node.role === "frontend");
  const services = topology.nodes.filter((node) => node.role === "service");
  const databases = topology.nodes.filter((node) => node.role === "database");
  const caches = topology.nodes.filter((node) => node.role === "cache");

  const lines = [
    `# ${canvas.title || "Untitled Canvas"} Infrastructure Blueprint`,
    "",
    `Generated by Synapse for canvas ${canvas._id || "unsaved-canvas"}.`,
    "",
    "## Topology Summary",
    `- Nodes discovered: ${topology.nodes.length}`,
    `- Edges discovered: ${topology.edges.length}`,
    `- Frontends: ${frontends.length}`,
    `- Services/APIs: ${services.length}`,
    `- Databases: ${databases.length}`,
    `- Caches: ${caches.length}`,
  ];

  if (!topology.nodes.length) {
    lines.push(
      "",
      "## Notes",
      "- The canvas does not contain any nodes yet, so the generated docker-compose scaffold only includes the shared network.",
    );

    return lines.join("\n");
  }

  lines.push("", "## Connection Map");

  if (!topology.edges.length) {
    lines.push("- No edges are defined yet.");
  } else {
    topology.edges.forEach((edge) => {
      lines.push(`- ${edge.source.label} -> ${edge.target.label}`);
    });
  }

  lines.push("", "## Node Inventory");

  topology.nodes.forEach((node) => {
    lines.push(`### ${node.label}`);
    lines.push(`- Role: ${node.role}`);
    lines.push(`- Service name: \`${node.serviceName}\``);
    lines.push(`- Runtime image: \`${node.image}\``);
    lines.push(`- Port mapping: \`${node.hostPort}:${node.containerPort}\``);
    lines.push(`- Technology stack: ${node.techStack.join(", ") || "Custom runtime"}`);
    lines.push(
      `- Outgoing connections: ${node.outgoingNodes.map((item) => item.label).join(", ") || "none"}`,
    );
    lines.push(
      `- Incoming connections: ${node.incomingNodes.map((item) => item.label).join(", ") || "none"}`,
    );
    lines.push(`- Depends on: ${node.dependsOn.join(", ") || "none"}`);
    lines.push("");
  });

  lines.push("## Compiler Assumptions");
  lines.push(
    "- Frontend and application service nodes are rendered as placeholder Node.js containers so the compose file remains valid even before application source code is mounted.",
  );
  lines.push(
    "- Database and cache nodes are mapped to official images based on detected technologies such as MongoDB, Postgres, MySQL, and Redis.",
  );
  lines.push(
    "- Environment variables are inferred from graph relationships, so frontends point at connected services and services point at connected databases/caches.",
  );
  lines.push(
    "- Every generated service joins the shared `synapse` bridge network to preserve the canvas-defined communication map.",
  );

  return lines.join("\n");
}

function compileInfrastructure(canvas) {
  const topology = buildTopology(canvas);

  return {
    canvasId: canvas?._id ? String(canvas._id) : null,
    title: canvas?.title || "Untitled Canvas",
    generatedAt: new Date().toISOString(),
    topology: {
      nodes: topology.nodes.map((node) => ({
        id: node.id,
        label: node.label,
        role: node.role,
        serviceName: node.serviceName,
        hostPort: node.hostPort,
        containerPort: node.containerPort,
        image: node.image,
        techStack: node.techStack,
        dependsOn: node.dependsOn,
        outgoing: node.outgoingNodes.map((item) => item.label),
        incoming: node.incomingNodes.map((item) => item.label),
      })),
      edges: topology.edges.map((edge) => ({
        id: edge.id,
        source: edge.source.id,
        target: edge.target.id,
        sourceLabel: edge.source.label,
        targetLabel: edge.target.label,
      })),
    },
    files: {
      "system_architecture.md": renderArchitectureMarkdown(canvas, topology),
      "docker-compose.yml": renderDockerCompose(canvas, topology),
    },
  };
}

module.exports = {
  compileInfrastructure,
};
