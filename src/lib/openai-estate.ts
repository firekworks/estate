type JsonSchema = Record<string, unknown>;

type OpenAIStructuredOptions = {
  model?: string;
  instructions: string;
  input: unknown;
  schemaName: string;
  schema: JsonSchema;
  webSearch?: boolean;
  includeSources?: boolean;
  maxOutputTokens?: number;
};

type OpenAIResponse = {
  error?: { message?: string } | null;
  output?: Array<{
    type?: string;
    content?: Array<{ type?: string; text?: string }>;
  }>;
};

export function hasOpenAIKey() {
  return Boolean(process.env.OPENAI_API_KEY);
}

export async function openAIStructured<T>({
  model,
  instructions,
  input,
  schemaName,
  schema,
  webSearch = false,
  includeSources = false,
  maxOutputTokens = 7000,
}: OpenAIStructuredOptions): Promise<T> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY no está configurada.");

  const body: Record<string, unknown> = {
    model: model ?? process.env.OPENAI_ESTATE_MODEL ?? "gpt-5.6-luna",
    instructions,
    input,
    store: false,
    max_output_tokens: maxOutputTokens,
    text: {
      format: {
        type: "json_schema",
        name: schemaName,
        strict: true,
        schema,
      },
    },
  };

  if (webSearch) {
    body.tools = [{ type: "web_search" }];
    body.tool_choice = "auto";
    if (includeSources) body.include = ["web_search_call.action.sources"];
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const data = (await response.json()) as OpenAIResponse;
  if (!response.ok) throw new Error(data.error?.message || `OpenAI API ${response.status}`);

  const text = data.output
    ?.filter((item) => item.type === "message")
    .flatMap((item) => item.content ?? [])
    .find((item) => item.type === "output_text")?.text;

  if (!text) throw new Error("La IA no devolvió una salida estructurada utilizable.");

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("La IA devolvió una respuesta que no se pudo interpretar.");
  }
}
