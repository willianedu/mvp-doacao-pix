import QRCode from 'qrcode';
import crypto from 'crypto';

function formatEmvField(id: string, value: string): string {
  const length = String(value.length).padStart(2, '0');
  return `${id}${length}${value}`;
}

function normalizeAscii(input: string, maxLen: number): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 .\-]/g, '')
    .trim()
    .slice(0, maxLen)
    .toUpperCase();
}

/**
 * Computes CRC16-CCITT (polynomial 0x1021, initial value 0xFFFF)
 * per Banco Central do Brasil Pix BR Code specification.
 */
function computeCrc16Ccitt(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export function generatePixTxid(): string {
  const randomPart = crypto.randomBytes(6).toString('hex').toUpperCase();
  return `ADM${randomPart}`.slice(0, 25);
}

export function buildPixBrCode(amount: number, txid: string): string {
  const pixKey = process.env.PIX_CHAVE || 'contato@doacoesecaridade.org.br';
  const merchantName = normalizeAscii(
    process.env.PIX_RECEBEDOR || 'DOACOES E CARIDADE',
    25
  );
  const merchantCity = normalizeAscii(process.env.PIX_CIDADE || 'SAO PAULO', 15);
  const safeTxid = txid.replace(/[^a-zA-Z0-9]/g, '').slice(0, 25) || 'ADMPIX2026';

  const gui = formatEmvField('00', 'br.gov.bcb.pix');
  const keyField = formatEmvField('01', pixKey);
  const merchantAccountInfo = formatEmvField('26', gui + keyField);

  const amountStr = amount.toFixed(2);
  const additionalData = formatEmvField('62', formatEmvField('05', safeTxid));

  const payloadWithoutCrc =
    formatEmvField('00', '01') +
    merchantAccountInfo +
    formatEmvField('52', '0000') +
    formatEmvField('53', '986') +
    formatEmvField('54', amountStr) +
    formatEmvField('58', 'BR') +
    formatEmvField('59', merchantName) +
    formatEmvField('60', merchantCity) +
    additionalData +
    '6304';

  const crc = computeCrc16Ccitt(payloadWithoutCrc);
  return payloadWithoutCrc + crc;
}

export interface PixGenerationResult {
  txid: string;
  codigoPix: string;
  qrCodeDataUrl: string;
  externalPaymentId: string | null;
  provider: 'mercadopago' | 'pix_direto';
}

export async function generatePixCharge(params: {
  amount: number;
  campaignTitle: string;
  donorName: string | null;
}): Promise<PixGenerationResult> {
  const txid = generatePixTxid();
  const mpToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;

  // Optional live Mercado Pago SDK/REST integration when token is configured
  if (mpToken && mpToken.trim().length > 10) {
    try {
      const response = await fetch('https://api.mercadopago.com/v1/payments', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${mpToken}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': txid,
        },
        body: JSON.stringify({
          transaction_amount: Number(params.amount.toFixed(2)),
          description: `Doação Doações e Caridade - ${params.campaignTitle}`.slice(0, 200),
          payment_method_id: 'pix',
          payer: {
            email: 'doador@doacoesecaridade.org.br',
            first_name: params.donorName || 'Apoiador',
          },
          external_reference: txid,
        }),
      });

      if (response.ok) {
        const data = (await response.json()) as {
          id?: number | string;
          point_of_interaction?: {
            transaction_data?: {
              qr_code?: string;
              qr_code_base64?: string;
            };
          };
        };

        const qrCodeStr = data.point_of_interaction?.transaction_data?.qr_code;
        if (qrCodeStr) {
          const qrDataUrl = data.point_of_interaction?.transaction_data?.qr_code_base64
            ? `data:image/png;base64,${data.point_of_interaction.transaction_data.qr_code_base64}`
            : await QRCode.toDataURL(qrCodeStr, {
                errorCorrectionLevel: 'M',
                margin: 2,
                width: 320,
                color: { dark: '#0F172A', light: '#FFFFFF' },
              });

          return {
            txid,
            codigoPix: qrCodeStr,
            qrCodeDataUrl: qrDataUrl,
            externalPaymentId: data.id ? String(data.id) : null,
            provider: 'mercadopago',
          };
        }
      }
    } catch (error) {
      // Fallback gracefully to direct Pix BR Code without exposing provider internals
      console.error('Mercado Pago API fallback triggered:', error);
    }
  }

  const codigoPix = buildPixBrCode(params.amount, txid);
  const qrCodeDataUrl = await QRCode.toDataURL(codigoPix, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 320,
    color: { dark: '#0F172A', light: '#FFFFFF' },
  });

  return {
    txid,
    codigoPix,
    qrCodeDataUrl,
    externalPaymentId: null,
    provider: 'pix_direto',
  };
}

export async function renderQrCodeDataUrl(codigoPix: string): Promise<string> {
  return QRCode.toDataURL(codigoPix, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 320,
    color: { dark: '#0F172A', light: '#FFFFFF' },
  });
}
