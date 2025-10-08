export interface PersonaEntry {
  index: number;
  information_title: string;
  information: string;
  information_key: string;
}

export interface ScriptEntry {
  index: number;
  scripts: string[];
}

export interface DirectorInput {
  persona?: PersonaEntry[];
  scripts?: ScriptEntry[];
}
