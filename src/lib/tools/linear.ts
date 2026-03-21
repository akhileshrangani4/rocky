type CreateIssueInput = {
  title: string;
  description?: string;
  teamId?: string;
  priority?: number;
  labels?: string[];
};

export async function createLinearIssue(input: CreateIssueInput) {
  const apiKey = process.env.LINEAR_ACCESS_TOKEN;
  if (!apiKey) {
    return { success: false, error: "Linear not configured. Set LINEAR_ACCESS_TOKEN." };
  }

  // If no teamId provided, fetch the first team
  let teamId = input.teamId;
  if (!teamId) {
    const teamsRes = await linearQuery(`{ teams { nodes { id name } } }`);
    const teams = teamsRes.data?.teams?.nodes;
    if (!teams?.length) {
      return { success: false, error: "No Linear teams found." };
    }
    teamId = teams[0].id;
  }

  // Resolve label IDs if label names provided
  let labelIds: string[] | undefined;
  if (input.labels?.length) {
    const labelsRes = await linearQuery(
      `{ issueLabels { nodes { id name } } }`,
    );
    const allLabels = labelsRes.data?.issueLabels?.nodes ?? [];
    labelIds = input.labels
      .map((name) => allLabels.find((l: { name: string; id: string }) =>
        l.name.toLowerCase() === name.toLowerCase(),
      )?.id)
      .filter(Boolean);
  }

  const mutation = `
    mutation CreateIssue($input: IssueCreateInput!) {
      issueCreate(input: $input) {
        success
        issue { id identifier title url }
      }
    }
  `;

  const variables = {
    input: {
      title: input.title,
      description: input.description,
      teamId,
      priority: input.priority,
      labelIds,
    },
  };

  const res = await linearQuery(mutation, variables);
  const issue = res.data?.issueCreate?.issue;

  if (!issue) {
    return { success: false, error: "Failed to create Linear issue." };
  }

  return {
    success: true,
    issueId: issue.identifier,
    url: issue.url,
    summary: `Created ${issue.identifier}: ${issue.title}`,
  };
}

async function linearQuery(query: string, variables?: Record<string, unknown>) {
  const res = await fetch("https://api.linear.app/graphql", {
    method: "POST",
    headers: {
      Authorization: process.env.LINEAR_ACCESS_TOKEN!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });
  return res.json();
}
