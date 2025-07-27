import SHA256 from 'crypto-js/sha256';

export interface LoteHashData {
  codigo: string;
  unidade: string;
  data_inicio: string;
  data_encerramento: string | null;
  peso_inicial: number;
  peso_atual: number;
  latitude: number | null;
  longitude: number | null;
  criado_por: string;
  voluntarios?: string[];
  entregas?: string[];
  fotos?: string[];
}

export const generateLoteHash = (data: LoteHashData): string => {
  // Criar um objeto ordenado e determinístico para o hash
  const hashData = {
    codigo: data.codigo,
    unidade: data.unidade,
    data_inicio: data.data_inicio,
    data_encerramento: data.data_encerramento,
    peso_inicial: Number(data.peso_inicial),
    peso_atual: Number(data.peso_atual),
    latitude: data.latitude ? Number(data.latitude) : null,
    longitude: data.longitude ? Number(data.longitude) : null,
    criado_por: data.criado_por,
    voluntarios: data.voluntarios?.sort() || [],
    entregas: data.entregas?.sort() || [],
    fotos: data.fotos?.sort() || []
  };

  // Converter para string JSON ordenada
  const dataString = JSON.stringify(hashData, Object.keys(hashData).sort());
  
  // Gerar hash SHA256
  return SHA256(dataString).toString();
};

export const validateLoteHash = (data: LoteHashData, storedHash: string): boolean => {
  const calculatedHash = generateLoteHash(data);
  return calculatedHash === storedHash;
};

export const formatHashDisplay = (hash: string): string => {
  if (!hash) return '';
  return `${hash.substring(0, 8)}...${hash.substring(hash.length - 8)}`;
};