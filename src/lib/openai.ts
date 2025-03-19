import OpenAI from 'openai';
import { supabase } from './supabase';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // Apenas para demonstração
});

export interface ModerationResult {
  flagged: boolean;
  categories: {
    hate: boolean;
    'hate/threatening': boolean;
    harassment: boolean;
    'self-harm': boolean;
    sexual: boolean;
    'sexual/minors': boolean;
    violence: boolean;
    'violence/graphic': boolean;
  };
  categoryScores: {
    hate: number;
    'hate/threatening': number;
    harassment: number;
    'self-harm': number;
    sexual: number;
    'sexual/minors': number;
    violence: number;
    'violence/graphic': number;
  };
}

async function checkUsageLimits(): Promise<boolean> {
  try {
    // Fetch settings
    const { data: settings, error: settingsError } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'moderation.openai')
      .single();

    if (settingsError) throw settingsError;
    if (!settings?.value?.enabled) return false;

    // Get today's usage
    const today = new Date().toISOString().split('T')[0];
    const { data: todayUsage, error: usageError } = await supabase
      .from('openai_usage')
      .select('tokens_used, cost_usd')
      .eq('date', today)
      .single();

    if (usageError && usageError.code !== 'PGRST116') throw usageError;

    // Check daily token limit
    if (todayUsage?.tokens_used >= settings.value.max_daily_tokens) {
      console.warn('Daily token limit reached');
      return false;
    }

    // Get monthly cost
    const monthStart = new Date();
    monthStart.setDate(1);
    const { data: monthlyUsage, error: monthlyError } = await supabase
      .from('openai_usage')
      .select('cost_usd')
      .gte('date', monthStart.toISOString().split('T')[0]);

    if (monthlyError) throw monthlyError;

    const monthlyCost = monthlyUsage?.reduce((sum, day) => sum + Number(day.cost_usd), 0) || 0;
    if (monthlyCost >= settings.value.max_monthly_cost_usd) {
      console.warn('Monthly cost limit reached');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error checking usage limits:', error);
    return false;
  }
}

async function trackUsage(tokens: number, endpoint: string) {
  try {
    const cost = tokens * 0.0001; // Exemplo de cálculo de custo
    const today = new Date().toISOString().split('T')[0];

    const { error } = await supabase
      .from('openai_usage')
      .upsert([{
        date: today,
        tokens_used: tokens,
        cost_usd: cost,
        endpoint
      }], {
        onConflict: 'date',
        ignoreDuplicates: false
      });

    if (error) throw error;
  } catch (error) {
    console.error('Error tracking usage:', error);
  }
}

export async function moderateContent(text: string): Promise<ModerationResult> {
  try {
    // Check if moderation is enabled and within limits
    const canUseAPI = await checkUsageLimits();
    if (!canUseAPI) {
      throw new Error('API usage limits reached or moderation disabled');
    }

    const response = await openai.moderations.create({ input: text });
    const result = response.results[0];

    // Track usage (approximate token count based on text length)
    const tokens = Math.ceil(text.length / 4);
    await trackUsage(tokens, 'moderation');

    return result;
  } catch (error) {
    console.error('Erro ao moderar conteúdo:', error);
    throw error;
  }
}

export function getViolationReason(result: ModerationResult | Record<string, boolean>): string {
  const violations: string[] = [];
  const categories = 'categories' in result ? result.categories : result;

  if (categories.hate || categories['hate/threatening']) {
    violations.push('Discurso de ódio ou ameaças');
  }
  if (categories.harassment) {
    violations.push('Assédio');
  }
  if (categories['self-harm']) {
    violations.push('Conteúdo relacionado a autoagressão');
  }
  if (categories.sexual || categories['sexual/minors']) {
    violations.push('Conteúdo sexual inapropriado');
  }
  if (categories.violence || categories['violence/graphic']) {
    violations.push('Violência ou conteúdo gráfico');
  }

  return violations.join(', ');
}