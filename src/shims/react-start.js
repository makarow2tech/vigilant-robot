// @tanstack/react-start yerine geçen ince katman.
// Bileşenler sunucu fonksiyonlarını useServerFn(fn) ile sarmalar; bu sürümde
// fonksiyonlar zaten fetch tabanlı olduğu için doğrudan döndürülür.
export function useServerFn(fn) {
  return fn;
}

export default { useServerFn };