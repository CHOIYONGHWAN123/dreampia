// criminal-background-check 버킷은 원래 공개 버킷이었다가 개인정보 보호를 위해 비공개로
// 전환됐다(20260830050000_criminal_background_check_private.sql). 전환 이전에 올라간
// 일부 event_rows.criminal_background_check 값은 여전히 그 시절의 공개 URL 형태(
// ".../object/public/criminal-background-check/...")로 남아있을 수 있어, storage.download()가
// 요구하는 버킷 내부 경로 형태로 정규화한다.
export function toCbcStoragePath(value: string): string {
  const marker = "/object/public/criminal-background-check/";
  const idx = value.indexOf(marker);
  return idx >= 0 ? value.slice(idx + marker.length) : value;
}
