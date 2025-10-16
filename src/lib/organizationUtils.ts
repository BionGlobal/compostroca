export const ORGANIZATION_UNITS = {
  'CWB001': 'CWB001 - Fazenda Urbana Cajuru',
  'CWB002': 'CWB002 - Fazenda Urbana Boqueirão',
  'CWB003': 'CWB003 - Fazenda Urbana Portão',
  // Adicionar outras unidades conforme necessário
} as const;

export const ORGANIZATION_ADDRESSES = {
  'CWB001': 'Rua XV de Novembro, 123 - Cajuru, Curitiba - PR',
  'CWB002': 'Av. São José, 456 - Boqueirão, Curitiba - PR',
  'CWB003': 'Rua Portão, 789 - Portão, Curitiba - PR',
} as const;

export const ORGANIZATION_COORDINATES = {
  'CWB001': { lat: -25.4284, lng: -49.2733 },
  'CWB002': { lat: -25.4839, lng: -49.2944 },
  'CWB003': { lat: -25.4372, lng: -49.2733 },
} as const;

export const getOrganizationName = (code: string): string => {
  return ORGANIZATION_UNITS[code as keyof typeof ORGANIZATION_UNITS] || code;
};

export const formatLocation = (latitude: number | null, longitude: number | null): string => {
  if (!latitude || !longitude) return 'Localização não disponível';
  return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
};

export const formatWeight = (weight: number): string => {
  return `${weight.toFixed(3)} kg`;
};

export const formatPesoDisplay = (weight: number): string => {
  return `${weight.toFixed(3)} kg`;
};

export const calculateWeightReduction = (initial: number, final: number): number => {
  if (initial === 0) return 0;
  return ((initial - final) / initial) * 100;
};

export const calculateProcessingTime = (startDate: string, endDate: string | null): string => {
  if (!endDate) return 'Em processamento';
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 7) {
    return `${diffDays} dias`;
  } else {
    const weeks = Math.floor(diffDays / 7);
    const remainingDays = diffDays % 7;
    return remainingDays > 0 ? `${weeks} semanas e ${remainingDays} dias` : `${weeks} semanas`;
  }
};