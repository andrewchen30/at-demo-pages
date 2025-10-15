export type AskResult = {
  result: string;
  raw: unknown;
};

export type AskFunction<Variables extends Record<string, unknown> = Record<string, unknown>> = (
  textMessage: string,
  variables: Variables,
  chatHistory: unknown[]
) => Promise<AskResult>;

export type AIRoleName = 'student' | 'director' | 'scriptWriter' | 'coach' | 'judge';

export interface AIRole<Variables extends Record<string, unknown> = Record<string, unknown>> {
  name: AIRoleName;
  ask: AskFunction<Variables>;
}
