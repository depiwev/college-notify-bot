export function formatSubjectName(sjn: string | null) {
  return sjn
    ?.replace(/[^А-Яа-яЁёA-Za-z\s]/g, "")
    .replace(/\s+/g, " ")
    .replace("(РПО)", "")
    .replace("МДК", "")
    .trim();
}
