import { NextRequest, NextResponse } from 'next/server';
import { checkDirectServiceEligibility } from '@/lib/locations-config';

interface ViaCepResponse {
  cep?: string;
  logradouro?: string;
  complemento?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean | string;
}

// Coordenadas base do Parque do Ibirapuera (ponto de partida / CEP 04094-050)
const BASE_LAT = -23.5874;
const BASE_LNG = -46.6576;

// Função auxiliar de cálculo de distância aproximada (Haversine com fator viário 1.32)
function calculateEstimatedDistanceKm(lat2: number, lon2: number): number {
  const R = 6371; // Raio da Terra em km
  const dLat = ((lat2 - BASE_LAT) * Math.PI) / 180;
  const dLon = ((lon2 - BASE_LNG) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((BASE_LAT * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const straightLine = R * c;
  // Fator de correção de malha viária urbana
  return Math.max(2, Math.round(straightLine * 1.32));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawCep = body.cep ? String(body.cep).replace(/\D/g, '') : '';
    const number = body.number ? String(body.number).trim() : '';
    const region = body.region ? String(body.region) : 'sao_paulo';

    if (!rawCep || rawCep.length !== 8) {
      return NextResponse.json(
        { success: false, message: 'Por favor, informe um CEP válido com 8 dígitos.' },
        { status: 400 }
      );
    }

    // 1. Busca os dados de endereço no ViaCEP
    let addressData: ViaCepResponse | null = null;
    try {
      const viaCepRes = await fetch(`https://viacep.com.br/ws/${rawCep}/json/`, {
        cache: 'no-store',
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(6000)
      });
      if (viaCepRes.ok) {
        addressData = await viaCepRes.json();
      }
    } catch {
      // Fallback em caso de lentidão do ViaCEP
    }

    if (!addressData || addressData.erro === true || addressData.erro === 'true') {
      return NextResponse.json(
        { success: false, message: 'CEP não encontrado. Por favor, verifique os 8 dígitos informados.' },
        { status: 404 }
      );
    }

    const logradouro = (addressData.logradouro || '').trim();
    const bairro = (addressData.bairro || '').trim();
    const cidade = (addressData.localidade || '').trim();
    const uf = (addressData.uf || '').trim();

    // REGRA EXCLUSIVA PARA O MUNICÍPIO DE SÃO PAULO
    // Aceita apenas CEP de logradouros do município de São Paulo.
    // Caso o CEP seja de outro município, emitir o aviso: "Local inválido, esse CEP não pertence a Cidade de São Paulo"
    if (region === 'sao_paulo') {
      const isSaoPauloCity =
        (cidade.toLowerCase() === 'são paulo' || cidade.toLowerCase() === 'sao paulo') &&
        uf.toUpperCase() === 'SP';

      if (!isSaoPauloCity || !logradouro) {
        return NextResponse.json(
          {
            success: false,
            message: 'Local inválido, esse CEP não pertence a Cidade de São Paulo'
          },
          { status: 400 }
        );
      }
    }

    // Monta o endereço formatado limpo para exibição
    const streetPart = logradouro ? `${logradouro}${number ? `, ${number}` : ''}` : `Número ${number || 's/n'}`;
    const neighborhoodPart = bairro ? ` — ${bairro}` : '';
    const fullFormattedAddress = `${streetPart}${neighborhoodPart}, ${cidade} - ${uf}`;

    // 2. REGRA EXCLUSIVA PARA "OUTRAS LOCALIDADES"
    // Cidades com atendimento direto pelo site:
    // Osasco, Diadema, Mauá, Ribeirão Pires, Taboão da Serra, Embu das Artes, Barueri (somente Alphaville).
    // Demais localidades interrompem a contratação e oferecem WhatsApp.
    if (region === 'outras_localidades') {
      const eligibility = checkDirectServiceEligibility(cidade, bairro, logradouro, rawCep);

      if (!eligibility.eligible) {
        // NÃO calcular preço, NÃO liberar agenda, NÃO permitir avançar para pagamento
        return NextResponse.json({
          success: true,
          eligible: false,
          reason: eligibility.reason,
          identifiedCity: eligibility.identifiedCity,
          identifiedSubRegion: eligibility.identifiedSubRegion,
          city: cidade,
          neighborhood: bairro,
          state: uf,
          address: fullFormattedAddress
        });
      }

      // Se elegível em Outras Localidades: calcular distância e aplicar regra de preço:
      // Preço final = R$ 499,00 + (distância em km × R$ 4,00)
      let estimatedKm = 10;
      const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

      if (apiKey) {
        try {
          const destQuery = encodeURIComponent(`${logradouro} ${number}, ${bairro}, ${cidade} - ${uf}, Brasil`);
          const mapsUrl = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${BASE_LAT},${BASE_LNG}&destinations=${destQuery}&mode=driving&key=${apiKey}`;
          const mapsRes = await fetch(mapsUrl, { signal: AbortSignal.timeout(5000) });
          if (mapsRes.ok) {
            const mapsJson = await mapsRes.json();
            const element = mapsJson?.rows?.[0]?.elements?.[0];
            if (element && element.status === 'OK' && element.distance?.value) {
              estimatedKm = Math.round(element.distance.value / 1000);
            }
          }
        } catch {
          // Usa fallback interno
        }
      }

      // Se não obteve pelo Google Maps, tenta geocodificação pública por CEP/Bairro
      if (estimatedKm === 10) {
        try {
          const geoQuery = encodeURIComponent(`${bairro ? `${bairro}, ` : ''}${cidade}, ${uf}, Brasil`);
          const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${geoQuery}&limit=1`, {
            headers: { 'User-Agent': 'ABC-do-Pedal-App/1.0' },
            signal: AbortSignal.timeout(4000)
          });
          if (geoRes.ok) {
            const geoJson = await geoRes.json();
            if (geoJson && geoJson.length > 0) {
              const lat = parseFloat(geoJson[0].lat);
              const lon = parseFloat(geoJson[0].lon);
              if (!isNaN(lat) && !isNaN(lon)) {
                estimatedKm = calculateEstimatedDistanceKm(lat, lon);
              }
            }
          }
        } catch {
          // Mantém estimativa segura
        }
      }

      const basePrice = eligibility.cityConfig?.basePrice ?? 499.00;
      const pricePerKm = eligibility.cityConfig?.pricePerKm ?? 4.00;
      const finalPrice = Math.round((basePrice + (estimatedKm * pricePerKm)) * 100) / 100;

      // IMPORTANTE: NÃO retornar CEP de origem, fórmula, valor por km ou distância.
      return NextResponse.json({
        success: true,
        eligible: true,
        price: finalPrice,
        formattedPrice: `R$ ${finalPrice.toFixed(2).replace('.', ',')}`,
        address: fullFormattedAddress,
        city: cidade,
        state: uf,
        neighborhood: bairro,
        street: logradouro,
        number: number
      });
    }

    // 3. FLUXO PRESERVADO PARA SÃO PAULO E ABC PAULISTA (INALTERADOS)
    let estimatedKm = 10;
    const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (apiKey) {
      try {
        const destQuery = encodeURIComponent(`${logradouro} ${number}, ${bairro}, ${cidade} - ${uf}, Brasil`);
        const mapsUrl = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${BASE_LAT},${BASE_LNG}&destinations=${destQuery}&mode=driving&key=${apiKey}`;
        const mapsRes = await fetch(mapsUrl, { signal: AbortSignal.timeout(5000) });
        if (mapsRes.ok) {
          const mapsJson = await mapsRes.json();
          const element = mapsJson?.rows?.[0]?.elements?.[0];
          if (element && element.status === 'OK' && element.distance?.value) {
            estimatedKm = Math.round(element.distance.value / 1000);
          }
        }
      } catch {
        // Usa fallback interno
      }
    }

    if (estimatedKm === 10) {
      try {
        const geoQuery = encodeURIComponent(`${bairro ? `${bairro}, ` : ''}${cidade}, ${uf}, Brasil`);
        const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${geoQuery}&limit=1`, {
          headers: { 'User-Agent': 'ABC-do-Pedal-App/1.0' },
          signal: AbortSignal.timeout(4000)
        });
        if (geoRes.ok) {
          const geoJson = await geoRes.json();
          if (geoJson && geoJson.length > 0) {
            const lat = parseFloat(geoJson[0].lat);
            const lon = parseFloat(geoJson[0].lon);
            if (!isNaN(lat) && !isNaN(lon)) {
              estimatedKm = calculateEstimatedDistanceKm(lat, lon);
            }
          }
        }
      } catch {
        // Mantém estimativa segura
      }
    }

    let finalPrice = 499.00;
    const lowerCity = cidade.toLowerCase();
    if (lowerCity.includes('santo andr') || lowerCity.includes('são bernardo') || lowerCity.includes('sao bernardo')) {
      finalPrice = 399.00;
    } else if (lowerCity.includes('são caetano') || lowerCity.includes('sao caetano') || lowerCity.includes('diadema')) {
      finalPrice = 449.00;
    } else if (estimatedKm <= 15) {
      finalPrice = 499.00;
    } else if (estimatedKm <= 25) {
      finalPrice = 549.00;
    } else if (estimatedKm <= 40) {
      finalPrice = 599.00;
    } else if (estimatedKm <= 55) {
      finalPrice = 649.00;
    } else {
      finalPrice = 699.00;
    }

    return NextResponse.json({
      success: true,
      eligible: true,
      price: finalPrice,
      formattedPrice: `R$ ${finalPrice.toFixed(2).replace('.', ',')}`,
      address: fullFormattedAddress,
      city: cidade,
      state: uf,
      neighborhood: bairro,
      street: logradouro,
      number: number
    });
  } catch (error) {
    console.error('Erro ao calcular preço por localização:', error);
    return NextResponse.json(
      { success: false, message: 'Não foi possível processar a consulta de local no momento.' },
      { status: 500 }
    );
  }
}
