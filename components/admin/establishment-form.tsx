"use client"

import { useActionState, useState } from 'react'
import { Save } from 'lucide-react'
import { saveEstablishmentAction, type AdminFormState } from '@/actions/admin'
import { saveCompanyAction, type CompanyState } from '@/actions/company'
import type { Establishment } from '@/lib/types'

type FormState = AdminFormState & CompanyState

export default function EstablishmentForm({
  establishment,
  mode = 'workspace',
}: {
  establishment: Establishment | null
  mode?: 'workspace' | 'company'
}) {
  const isCompany = mode === 'company'
  const [state, formAction, isPending] = useActionState<FormState, FormData>(
    isCompany ? saveCompanyAction : saveEstablishmentAction,
    {}
  )
  const [layoutTheme, setLayoutTheme] = useState<number>(establishment?.layout_theme ?? 1)

  const e = establishment

  const layoutOptions = [
    {
      value: 1,
      title: 'Clássico',
      desc: 'Banner ao centro, foto redonda sobreposta e nome em destaque.',
    },
    {
      value: 2,
      title: 'Painel',
      desc: 'Lateral fixa com foto e contatos; serviços rolando ao lado.',
    },
    {
      value: 3,
      title: 'Editorial',
      desc: 'Banner gigante estilo capa, nome enorme e listas de revista.',
    },
  ]

  return (
    <form action={formAction} className="space-y-5">
      {state.error && <div className="error-box" role="alert">{state.error}</div>}
      {state.ok && !state.error && (
        <div className="ok-box" role="status">
          {isCompany ? 'Dados da empresa salvos com sucesso!' : 'Dados da barbearia salvos com sucesso!'}
        </div>
      )}

      {e && <input type="hidden" name="id" value={e.id} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="est-name">{isCompany ? 'Nome da empresa *' : 'Nome da barbearia *'}</label>
          <input id="est-name" name="name" required defaultValue={e?.name ?? ''} className="input" placeholder="BarberPro Studio" />
        </div>

        <div className="sm:col-span-2">
          <label className="label" htmlFor="est-address">Endereço</label>
          <input id="est-address" name="address" defaultValue={e?.address ?? ''} className="input" placeholder="Rua, número, cidade" />
        </div>

        <div>
          <label className="label" htmlFor="est-phone">Telefone</label>
          <input id="est-phone" name="phone" defaultValue={e?.phone ?? ''} className="input" placeholder="(11) 4002-8922" />
        </div>

        <div>
          <label className="label" htmlFor="est-whatsapp">WhatsApp</label>
          <input id="est-whatsapp" name="whatsapp" defaultValue={e?.whatsapp ?? ''} className="input" placeholder="(11) 99999-0001" />
        </div>

        <div>
          <label className="label" htmlFor="est-instagram">Instagram</label>
          <input id="est-instagram" name="instagram" defaultValue={e?.instagram ?? ''} className="input" placeholder="@suabarbearia" />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="est-pix">Chave Pix (recebimento direto, sem taxas)</label>
          <input
            id="est-pix"
            name="pix_key"
            defaultValue={e?.pix_key ?? ''}
            className="input"
            placeholder="CPF/CNPJ, e-mail, telefone (+55...) ou chave aleatória"
          />
          <p className="mt-1 text-[11px] text-stone-400">
            Com a chave configurada, o site gera QR Code Pix automático para pedidos e agendamentos.
          </p>
        </div>

        <div className="sm:col-span-2">
          <label className="label" htmlFor="est-slug">Endereço do perfil público</label>
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-sm text-stone-400">/p/</span>
            <input
              id="est-slug"
              name="slug"
              defaultValue={e?.slug ?? ''}
              className="input"
              placeholder="studio-joao"
              inputMode="url"
            />
          </div>
          <p className="mt-1 text-[11px] text-stone-400">
            Link para divulgar no Instagram e na bio (ex.: /p/studio-joao). Só letras minúsculas,
            números e hífens. Vazio = mantém o atual.
          </p>
        </div>

        {!isCompany && (
          <div className="card space-y-5 border-stone-800 bg-stone-950/40 p-5 sm:col-span-2">
            <div>
              <h3 className="font-serif text-base font-bold uppercase tracking-wide text-stone-100">
                Site e apresentação
              </h3>
              <p className="mt-1 text-xs text-stone-400">
                Como o SEU site ({'{'}seu-nome{'}'}.SEU_DOMÍNIO) aparece para os clientes.
              </p>
            </div>

            {/* escolha do layout */}
            <div>
              <span className="label">Layout do site</span>
              <div className="grid gap-3 sm:grid-cols-3">
                {layoutOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setLayoutTheme(opt.value)}
                    aria-pressed={layoutTheme === opt.value}
                    className={
                      'cursor-pointer rounded-xl border p-3 text-left transition-colors ' +
                      (layoutTheme === opt.value
                        ? 'border-amber-500 bg-amber-500/10'
                        : 'border-stone-700 hover:border-amber-500/40')
                    }
                  >
                    {/* mini-wireframe do layout */}
                    <span className="mb-3 flex h-16 overflow-hidden rounded-lg border border-stone-800 bg-stone-900">
                      {opt.value === 1 && (
                        <span className="flex w-full flex-col items-center justify-center gap-1.5">
                          <span className="h-6 w-6 rounded-full bg-amber-500/70" />
                          <span className="h-1 w-12 rounded bg-stone-600" />
                          <span className="h-1 w-8 rounded bg-stone-700" />
                        </span>
                      )}
                      {opt.value === 2 && (
                        <span className="flex w-full">
                          <span className="flex h-full w-1/3 flex-col items-center justify-end gap-1 border-r border-stone-800 bg-stone-800/70 pb-2">
                            <span className="h-5 w-5 rounded bg-amber-500/70" />
                            <span className="h-1 w-8 rounded bg-stone-600" />
                          </span>
                          <span className="flex h-full flex-1 flex-col justify-center gap-1.5 px-2">
                            <span className="h-1 w-full rounded bg-stone-600" />
                            <span className="h-1 w-full rounded bg-stone-700" />
                            <span className="h-1 w-2/3 rounded bg-stone-700" />
                          </span>
                        </span>
                      )}
                      {opt.value === 3 && (
                        <span className="relative w-full bg-gradient-to-b from-stone-800 to-stone-900">
                          <span className="absolute bottom-2 left-2 h-3 w-16 rounded bg-amber-500/80" />
                          <span className="absolute bottom-2 right-2 h-4 w-4 rounded-full bg-stone-600" />
                          <span className="absolute left-2 top-2 h-1 w-8 rounded bg-stone-600" />
                        </span>
                      )}
                    </span>
                    <span className="block text-sm font-semibold text-stone-100">{opt.title}</span>
                    <span className="mt-0.5 block text-[11px] leading-snug text-stone-400">{opt.desc}</span>
                  </button>
                ))}
              </div>
              <input type="hidden" name="layout_theme" value={layoutTheme} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="est-display">Nome de exibição</label>
                <input
                  id="est-display"
                  name="display_name"
                  defaultValue={e?.display_name ?? ''}
                  className="input"
                  placeholder="Como no site (vazio = seu nome de barbeiro)"
                  maxLength={60}
                />
              </div>
              <div>
                <label className="label" htmlFor="est-tagline">Frase de apresentação</label>
                <input
                  id="est-tagline"
                  name="tagline"
                  defaultValue={e?.tagline ?? ''}
                  className="input"
                  placeholder="Ex.: Degradê impecável, sem fila de espera"
                  maxLength={140}
                />
              </div>
            </div>

            <div>
              <label className="label" htmlFor="est-banner">Banner do site (foto do espaço/trabalho)</label>
              {e?.banner_url && (
                <div className="mb-2 flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={e.banner_url}
                    alt="Banner atual"
                    className="h-16 w-32 rounded-lg border border-stone-800 object-cover"
                  />
                  <label className="flex cursor-pointer items-center gap-2 text-xs text-stone-400">
                    <input
                      type="checkbox"
                      name="remove_banner"
                      className="h-4 w-4 accent-amber-500"
                    />
                    Remover banner atual
                  </label>
                </div>
              )}
              <input
                id="est-banner"
                name="banner_file"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="input py-1.5 text-xs"
              />
              <p className="mt-1 text-[11px] text-stone-400">
                JPG/PNG/WebP até 4MB — ideal 1600×600. Sem banner, o site usa o fundo padrão.
              </p>
            </div>
          </div>
        )}

        <div className="sm:col-span-2">
          <label className="flex cursor-pointer items-start gap-2 text-sm text-stone-300">
            <input
              type="checkbox"
              name="require_prepayment"
              defaultChecked={e?.require_prepayment ?? false}
              className="mt-0.5 h-4 w-4 accent-amber-500"
            />
            <span>
              Solicitar pagamento antecipado via Pix
              <span className="block text-xs text-stone-400">
                Mostra o QR Code Pix assim que o cliente agenda, com aviso para enviar o
                comprovante pelo WhatsApp. O horário só é confirmado quando você validar o
                pagamento no painel.
              </span>
            </span>
          </label>
        </div>
      </div>

      {e && (
        <p className="text-xs text-stone-400">
          Plano atual: <span className="font-medium text-amber-400">{e.plan === 'free' ? 'Grátis' : e.plan}</span>
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="est-open">Abre às</label>
          <input id="est-open" name="opening_time" type="time" defaultValue={e?.opening_time?.slice(0, 5) ?? '09:00'} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="est-close">Fecha às</label>
          <input id="est-close" name="closing_time" type="time" defaultValue={e?.closing_time?.slice(0, 5) ?? '19:00'} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="est-step">Intervalo entre horários (min)</label>
          <input id="est-step" name="slot_step_min" type="number" min={5} max={60} step={5} defaultValue={e?.slot_step_min ?? 15} className="input" />
        </div>
      </div>

      <button type="submit" disabled={isPending} className="btn btn-primary">
        <Save className="h-4 w-4" />
        {isPending ? 'Salvando...' : e ? 'Salvar alterações' : 'Criar barbearia'}
      </button>
    </form>
  )
}
