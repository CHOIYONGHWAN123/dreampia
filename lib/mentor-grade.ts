// 강사등급을 위한 점수(mentors.score)를 화면 표시용 등급 문자로 변환.
// 실제 점수 데이터는 그대로 두고 표시만 등급화한다.
export function scoreToGrade(score: number | null): string {
  if (score === null || Number.isNaN(score)) return '-'
  if (score >= 90) return 'A'
  if (score >= 80) return 'B'
  if (score >= 70) return 'C'
  if (score >= 60) return 'D'
  return 'E'
}

export function formatScoreWithGrade(score: number | null): string {
  if (score === null || Number.isNaN(score)) return '-'
  return `${score} (${scoreToGrade(score)})`
}
