export function extractAIResponseText(data: any): string {
  if (!data) {
    return '';
  }

  if (Array.isArray(data.output)) {
    for (const item of data.output) {
      if (item?.status === 'completed') {
        const content = Array.isArray(item.content) ? item.content : [];
        for (const entry of content) {
          if (typeof entry?.text === 'string') {
            return entry.text;
          }
          if (typeof entry?.output_text === 'string') {
            return entry.output_text;
          }
        }

        const aggregated = content
          .map((entry: any) => entry?.text || entry?.output_text || '')
          .filter(Boolean)
          .join('')
          .trim();

        if (aggregated) {
          return aggregated;
        }
      }
    }
  }

  if (Array.isArray(data.output_text) && data.output_text.length > 0) {
    return data.output_text.join('\n').trim();
  }

  return typeof data.result === 'string' ? data.result : '';
}
