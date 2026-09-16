export function formatSubjectName(sjn: string | null) {
  return sjn
    ?.replace(/^[А-Яа-яЁё]+\.\d+\s*/, "")
    .replace("(РПО)", "")
    .trim();
}
