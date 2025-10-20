/**
 * Utilitários para validação e cálculo de geolocalização
 */

/**
 * Calcula distância em metros entre dois pontos GPS usando fórmula de Haversine
 */
export function calcularDistanciaMetros(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Raio da Terra em metros
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distância em metros
}

/**
 * Verifica se um ponto está dentro do raio permitido de outro ponto
 * @param raioMetros Raio em metros (padrão: 300m)
 */
export function validarGeolocalizacao(
  latReferencia: number | null | undefined,
  lonReferencia: number | null | undefined,
  latEvento: number | null | undefined,
  lonEvento: number | null | undefined,
  raioMetros: number = 300
): {
  valido: boolean;
  distancia: number | null;
  foraDaUnidade: boolean;
} {
  // Se não tiver coordenadas, não pode validar
  if (latReferencia == null || lonReferencia == null || latEvento == null || lonEvento == null) {
    return {
      valido: false,
      distancia: null,
      foraDaUnidade: false
    };
  }

  const distancia = calcularDistanciaMetros(
    latReferencia,
    lonReferencia,
    latEvento,
    lonEvento
  );

  const foraDaUnidade = distancia > raioMetros;

  return {
    valido: true,
    distancia: Math.round(distancia),
    foraDaUnidade
  };
}

/**
 * Formata coordenadas GPS para exibição
 */
export function formatarCoordenadas(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
  casasDecimais: number = 6
): string {
  if (!latitude || !longitude) return 'Coordenadas indisponíveis';
  return `${latitude.toFixed(casasDecimais)}, ${longitude.toFixed(casasDecimais)}`;
}

/**
 * Gera link do Google Maps com coordenadas
 */
export function gerarLinkGoogleMaps(
  latitude: number | null | undefined,
  longitude: number | null | undefined
): string {
  if (!latitude || !longitude) return '#';
  return `https://www.google.com/maps?q=${latitude},${longitude}`;
}
