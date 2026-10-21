"use client"

import { useActionState } from 'react'
import { Save } from 'lucide-react'
import { saveBarberAction, type AdminFormState } from '@/actions/admin'
import { WEEKDAY_LABELS } from '@/lib/tz'
import type { Barber, Service } from '@/lib/types'

export interface ScheduleWindow {
  start: string
  end: string
}

interface Props {
  barber: Barber | null
  services: Service[]
  selectedServiceIds: string[]
  scheduleByDay: Record<number, ScheduleWindow[]>
  linkableProfiles: { id: string; full_name: string; email: string | null; role: string }[]
}

export default function BarberForm({
  barber,
  services,
  selectedServiceIds,
  scheduleByDay,
  linkableProfiles,
}: Props) {
  const [state, formAction, isPending] = useActionState<AdminFormState, FormData>(
    saveBarberAction,
    {}
  )

  return (
    <form action={formAction} className="space-y-6">
      {state.error && <div className="error-box">{state.error}</div>}
      {state.ok && !state.error && state.notice && <div className="error-box">{state.notice}</div>}
      {state.ok && !state.error && !state.notice && (
        <div className="ok-box">Barbeiro salvo com sucesso!</div>
      )}

      {barber && <input type="hidden" name="id" value={barber.id} />}

      {/* dados principais */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor={'name-' + (barber?.id ?? 'new')}>Nome completo *</label>
          <input
            id={'name-' + (barber?.id ?? 'new')}
            name="full_name"
            required
            defaultValue={barber?.full_name ?? ''}
            className="input"
            placeholder="Ex.: Rafael Costa"
          />
        </div>
        <div>
          <label className="label" htmlFor={'commission-' + (barber?.id ?? 'new')}>Comissão (%)</label>
          <input
            id={'commission-' + (barber?.id ?? 'new')}
            name="commission_pct"
            type="number"
            min={0}
            max={100}
            step="0.5"
            defaultValue={barber?.commission_pct ?? 0}
            className="input"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor={'bio-' + (barber?.id ?? 'new')}>Bio</label>
          <textarea
            id={'bio-' + (barber?.id ?? 'new')}
            name="bio"
            rows={2}
            defaultValue={barber?.bio ?? ''}
            className="input resize-none"
            placeholder="Especialidades, experiência..."
          />
        </div>
        <div>
          <label className="label" htmlFor={'photo-' + (barber?.id ?? 'new')}>Foto (URL)</label>
          <input
            id={'photo-' + (barber?.id ?? 'new')}
            name="photo_url"
            type="url"
            defaultValue={barber?.photo_url ?? ''}
            className="input"
            placeholder="https://..."
          />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor={'photo-file-' + (barber?.id ?? 'new')}>
            …ou envie uma foto do computador (JPG/PNG/WebP, máx. 4MB)
          </label>
          <input
            id={'photo-file-' + (barber?.id ?? 'new')}
            name="photo_file"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="input file:mr-3 file:rounded-md file:border-0 file:bg-amber-500 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-stone-950"
          />
          {barber?.photo_url && (
            <p className="mt-2 flex items-center gap-2 text-xs text-stone-400">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={barber.photo_url} alt="" className="h-10 w-10 rounded-full object-cover" />
              Foto atual — envie outra para substituir.
            </p>
          )}
        </div>
        <div>
          <label className="label" htmlFor={'profile-' + (barber?.id ?? 'new')}>
            Login vinculado (opcional)
          </label>
          <select
            id={'profile-' + (barber?.id ?? 'new')}
            name="profile_id"
            defaultValue={barber?.profile_id ?? ''}
            className="input"
          >
            <option value="">— sem login vinculado —</option>
            {linkableProfiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name} ({p.email ?? 'sem e-mail'})
              </option>
            ))}
          </select>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-stone-300">
        <input
          type="checkbox"
          name="is_active"
          defaultChecked={barber ? barber.is_active : true}
          className="h-4 w-4 accent-amber-500"
        />
        Barbeiro ativo (aparece no site e pode receber agendamentos)
      </label>

      {/* serviços */}
      <div>
        <p className="label">Serviços que executa</p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => (
            <label
              key={s.id}
              className="flex items-center gap-2 rounded-lg border border-stone-800 bg-stone-900/60 px-3 py-2 text-sm text-stone-300"
            >
              <input
                type="checkbox"
                name="service_ids"
                value={s.id}
                defaultChecked={selectedServiceIds.includes(s.id)}
                className="h-4 w-4 accent-amber-500"
              />
              <span className="truncate">{s.name}</span>
            </label>
          ))}
          {services.length === 0 && (
            <p className="text-sm text-stone-400">
              Cadastre serviços primeiro na aba “Serviços”.
            </p>
          )}
        </div>
      </div>

      {/* escala semanal */}
      <div>
        <p className="label">Jornada semanal (máx. 2 janelas por dia)</p>
        <div className="space-y-2">
          {WEEKDAY_LABELS.map((label, d) => {
            const windows = scheduleByDay[d] ?? []
            const w1 = windows[0] ?? { start: '09:00', end: '18:00' }
            const w2 = windows[1] ?? { start: '14:00', end: '19:00' }
            return (
              <div
                key={d}
                className="grid grid-cols-[auto_1fr] items-center gap-3 rounded-lg border border-stone-800 bg-stone-900/60 px-3 py-2.5 sm:grid-cols-[auto_auto_1fr_1fr]"
              >
                <label className="flex items-center gap-2 text-sm font-medium text-stone-300">
                  <input
                    type="checkbox"
                    name={'enabled_' + d}
                    defaultChecked={windows.length > 0}
                    className="h-4 w-4 accent-amber-500"
                  />
                  {label}
                </label>
                <span className="hidden text-xs text-stone-400 sm:block">Janela 1</span>
                <span className="grid grid-cols-2 gap-2 sm:col-span-1">
                  <input
                    type="time"
                    name={'start_' + d + '_1'}
                    defaultValue={w1.start.slice(0, 5)}
                    aria-label={label + ' início janela 1'}
                    className="input px-2 py-1.5 text-xs"
                  />
                  <input
                    type="time"
                    name={'end_' + d + '_1'}
                    defaultValue={w1.end.slice(0, 5)}
                    aria-label={label + ' fim janela 1'}
                    className="input px-2 py-1.5 text-xs"
                  />
                </span>
                <span className="col-span-2 grid grid-cols-2 gap-2 sm:col-span-1">
                  <input
                    type="time"
                    name={'start_' + d + '_2'}
                    defaultValue={windows[1] ? w2.start.slice(0, 5) : ''}
                    aria-label={label + ' início janela 2'}
                    className="input px-2 py-1.5 text-xs"
                  />
                  <input
                    type="time"
                    name={'end_' + d + '_2'}
                    defaultValue={windows[1] ? w2.end.slice(0, 5) : ''}
                    aria-label={label + ' fim janela 2'}
                    className="input px-2 py-1.5 text-xs"
                  />
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <button type="submit" disabled={isPending} className="btn btn-primary">
        <Save className="h-4 w-4" />
        {isPending ? 'Salvando...' : barber ? 'Salvar barbeiro' : 'Cadastrar barbeiro'}
      </button>
    </form>
  )
}
