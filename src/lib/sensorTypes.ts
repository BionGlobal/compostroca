/**
 * Tipos auxiliares para dados de sensores IoT
 */

export interface LeituraDiariaSensor {
  id: string;
  created_at: string;
  lote_id: string;
  numero_caixa: number;
  
  // Sensores Caixa 2 (Semana 2) - UTC
  temperatura_solo?: number | null;
  umidade_solo?: number | null;
  condutividade_agua_poros?: number | null;
  
  // Sensores Caixa 6 (Semana 6) - NPK
  nitrogenio?: number | null;
  fosforo?: number | null;
  potassio?: number | null;
  ph?: number | null;
}

export interface MediaSensoresLote {
  lote_id: string;
  updated_at?: string | null;
  
  // Médias Semana 2 (Caixa 2)
  media_temperatura_semana2?: number | null;
  media_umidade_semana2?: number | null;
  media_condutividade_semana2?: number | null;
  
  // Médias Semana 6 (Caixa 6)
  media_nitrogenio_semana6?: number | null;
  media_fosforo_semana6?: number | null;
  media_potassio_semana6?: number | null;
  media_ph_semana6?: number | null;
}
