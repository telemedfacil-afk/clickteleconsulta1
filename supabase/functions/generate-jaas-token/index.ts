import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const APP_ID = 'vpaas-magic-cookie-c837d3d52a48449b8d190279cac3b770'
const KID = 'vpaas-magic-cookie-c837d3d52a48449b8d190279cac3b770/e9a79a'

// Base64url encoder for objects (JSON serialization)
const base64urlEncodeObj = (obj: object): string => {
  const json = JSON.stringify(obj)
  const b64 = btoa(unescape(encodeURIComponent(json)))
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

// Base64url encoder for raw bytes (Uint8Array)
const base64urlEncodeBytes = (bytes: Uint8Array): string => {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  const b64 = btoa(binary)
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

const generateRS256JWT = async (
  privateKeyPem: string,
  payload: object
): Promise<string> => {
  // Remove PEM headers/footers and whitespace
  const pemBody = privateKeyPem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/-----BEGIN RSA PRIVATE KEY-----/, '')
    .replace(/-----END RSA PRIVATE KEY-----/, '')
    .replace(/\s/g, '')

  // Decode base64 to binary DER
  const binaryDer = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0))

  // Import the key
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryDer.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  )

  // Build JWT header and payload
  const header = base64urlEncodeObj({ alg: 'RS256', typ: 'JWT', kid: KID })
  const encodedPayload = base64urlEncodeObj(payload)
  const signingInput = `${header}.${encodedPayload}`

  // Sign
  const toSign = new TextEncoder().encode(signingInput)
  const sigBuffer = await crypto.subtle.sign(
    { name: 'RSASSA-PKCS1-v1_5' },
    cryptoKey,
    toSign
  )

  const signature = base64urlEncodeBytes(new Uint8Array(sigBuffer))
  return `${signingInput}.${signature}`
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    // Parse request body
    const { appointmentId, userId, displayName, email, isModerator } = await req.json()

    if (!appointmentId || !userId) {
      return new Response(
        JSON.stringify({ error: 'appointmentId and userId are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Read private key from environment — NEVER hardcode
    const privateKeyPem = Deno.env.get('JAAS_PRIVATE_KEY')
    if (!privateKeyPem) {
      console.error('JAAS_PRIVATE_KEY env var is not set')
      return new Response(
        JSON.stringify({ error: 'Server configuration error: missing signing key' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Validate user access to appointment via SERVICE_ROLE_KEY
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    })

    const { data: appointment, error: apptError } = await adminClient
      .from('agendamentos')
      .select(`
        id,
        patient_id,
        medicos:medico_id (id, user_id)
      `)
      .eq('id', appointmentId)
      .single()

    if (apptError || !appointment) {
      console.error('Appointment lookup error:', apptError)
      return new Response(
        JSON.stringify({ error: 'Agendamento não encontrado' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Authorization: only the patient or the doctor of this appointment may get a token
    const isPatient = appointment.patient_id === userId
    // medicos may be array or object depending on join
    const medicoRecord = Array.isArray(appointment.medicos)
      ? appointment.medicos[0]
      : appointment.medicos
    const isDoctor = medicoRecord?.user_id === userId

    if (!isPatient && !isDoctor) {
      return new Response(
        JSON.stringify({ error: 'Acesso negado: usuário não faz parte deste agendamento' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Build JWT payload
    const now = Math.floor(Date.now() / 1000)
    const jwtPayload = {
      aud: 'jitsi',
      iss: 'chat',
      iat: now,
      exp: now + 3600,
      nbf: now - 5,
      sub: APP_ID,
      context: {
        user: {
          id: userId,
          name: displayName || (isModerator ? 'Médico' : 'Paciente'),
          email: email || '',
          moderator: Boolean(isModerator),
          avatar: '',
        },
        features: {
          livestreaming: false,
          recording: false,
          transcription: false,
          'outbound-call': false,
        },
      },
      room: '*',
    }

    const token = await generateRS256JWT(privateKeyPem, jwtPayload)

    const roomName = `${APP_ID}/clicktele-${appointmentId}`

    return new Response(
      JSON.stringify({ token, roomName, appId: APP_ID }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  } catch (err) {
    console.error('generate-jaas-token error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error', detail: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
