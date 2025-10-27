import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const diagnostics = {
      nodeEnv: process.env.NODE_ENV,
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      databaseUrlPrefix: process.env.DATABASE_URL?.substring(0, 20) + '...',
      hasGeminiKey: !!process.env.GEMINI_API_KEY,
      hasSerperKey: !!process.env.SERPER_API_KEY,
      hasAdminPassword: !!process.env.ADMIN_PASSWORD,
      platform: process.platform,
      nodeVersion: process.version,
      cwd: process.cwd(),
    }

    return NextResponse.json({
      status: 'ok',
      diagnostics
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Diagnostic failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
