import React, { useEffect, useMemo, useState } from 'react'
import PageHeader from './PageHeader'
import { Button, Card } from './UI'
import { Icon } from './Icons'
import { tanseekApi } from '../api/tanseekApi'
import { PERMISSION_OPTIONS } from '../auth/permissions'
import { useLanguage } from '../i18n/LanguageContext'

const emptyAccount = {
  name: '',
  email: '',
  password: '',
  role: '',
  department_name: '',
}

const emptyRole = {
  name: '',
  description: '',
  permissions: ['overview.view'],
}

function Field({ label, children, hint }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold uppercase tracking-[0.08em] text-tanseek-muted">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-[11px] leading-5 text-tanseek-muted">{hint}</span>}
    </label>
  )
}

function LoadingBlock({ text }) {
  return (
    <Card className="grid min-h-[280px] place-items-center p-8 text-center">
      <div>
        <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-tanseek-line border-t-tanseek-teal" />
        <p className="mt-4 text-sm text-tanseek-muted">{text}</p>
      </div>
    </Card>
  )
}

export default function SystemAdministration({ currentUser }) {
  const { t } = useLanguage()
  const [tab, setTab] = useState('accounts')
  const [accounts, setAccounts] = useState([])
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [accountEditorOpen, setAccountEditorOpen] = useState(false)
  const [roleEditorOpen, setRoleEditorOpen] = useState(false)
  const [editingAccountId, setEditingAccountId] = useState(null)
  const [editingRoleId, setEditingRoleId] = useState(null)
  const [accountForm, setAccountForm] = useState(emptyAccount)
  const [roleForm, setRoleForm] = useState(emptyRole)

  const selectedRole = useMemo(
    () => roles.find(role => role.id === accountForm.role) || null,
    [roles, accountForm.role]
  )

  async function load() {
    setLoading(true)
    setError('')
    try {
      const [accountsPayload, rolesPayload] = await Promise.all([
        tanseekApi.getAdminAccounts(),
        tanseekApi.getAdminRoles(),
      ])
      setAccounts(Array.isArray(accountsPayload?.accounts) ? accountsPayload.accounts : [])
      setRoles(Array.isArray(rolesPayload?.roles) ? rolesPayload.roles : [])
    } catch (err) {
      setError(err?.message || 'Could not load system administration data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  function startNewAccount() {
    setEditingAccountId(null)
    setAccountForm({ ...emptyAccount, role: roles[0]?.id || '' })
    setAccountEditorOpen(true)
    setMessage('')
    setError('')
  }

  function editAccount(account) {
    setEditingAccountId(account.id)
    setAccountForm({
      name: account.name || '',
      email: account.email || '',
      password: '',
      role: account.role || '',
      department_name: account.department_name || '',
    })
    setAccountEditorOpen(true)
    setMessage('')
    setError('')
  }

  async function saveAccount(event) {
    event.preventDefault()
    setError('')
    setMessage('')
    if (!accountForm.name.trim() || !accountForm.email.trim() || !accountForm.role || (!editingAccountId && !accountForm.password.trim())) {
      setError(t('Name, email, role and an initial password are required.'))
      return
    }

    setSaving(true)
    try {
      const payload = {
        ...accountForm,
        name: accountForm.name.trim(),
        email: accountForm.email.trim().toLowerCase(),
        department_name: accountForm.department_name.trim() || 'University-wide access',
      }
      if (editingAccountId && !payload.password) delete payload.password

      if (editingAccountId) await tanseekApi.updateAdminAccount(editingAccountId, payload)
      else await tanseekApi.createAdminAccount(payload)

      setAccountEditorOpen(false)
      setEditingAccountId(null)
      setAccountForm(emptyAccount)
      setMessage(t(editingAccountId ? 'Account updated.' : 'Account created.'))
      await load()
    } catch (err) {
      setError(err?.message || t('Could not save this account.'))
    } finally {
      setSaving(false)
    }
  }

  async function deleteAccount(account) {
    if (String(account.id) === String(currentUser?.id)) return
    if (!window.confirm(`${t('Delete account')} ${account.name}?`)) return
    setError('')
    setMessage('')
    try {
      await tanseekApi.deleteAdminAccount(account.id)
      setMessage(t('Account deleted.'))
      await load()
    } catch (err) {
      setError(err?.message || t('Could not delete this account.'))
    }
  }

  function startNewRole() {
    setEditingRoleId(null)
    setRoleForm(emptyRole)
    setRoleEditorOpen(true)
    setMessage('')
    setError('')
  }

  function editRole(role) {
    if (role.built_in) return
    setEditingRoleId(role.id)
    setRoleForm({
      name: role.name || '',
      description: role.description || '',
      permissions: Array.isArray(role.permissions) ? role.permissions : [],
    })
    setRoleEditorOpen(true)
    setMessage('')
    setError('')
  }

  function togglePermission(permission) {
    setRoleForm(current => ({
      ...current,
      permissions: current.permissions.includes(permission)
        ? current.permissions.filter(item => item !== permission)
        : [...current.permissions, permission],
    }))
  }

  async function saveRole(event) {
    event.preventDefault()
    setError('')
    setMessage('')
    if (!roleForm.name.trim()) {
      setError(t('Role name is required.'))
      return
    }
    if (roleForm.permissions.length === 0) {
      setError(t('Select at least one permission.'))
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: roleForm.name.trim(),
        description: roleForm.description.trim(),
        permissions: roleForm.permissions,
      }
      if (editingRoleId) await tanseekApi.updateAdminRole(editingRoleId, payload)
      else await tanseekApi.createAdminRole(payload)

      setRoleEditorOpen(false)
      setEditingRoleId(null)
      setRoleForm(emptyRole)
      setMessage(t(editingRoleId ? 'Role updated.' : 'Role created.'))
      await load()
    } catch (err) {
      setError(err?.message || t('Could not save this role.'))
    } finally {
      setSaving(false)
    }
  }

  async function deleteRole(role) {
    if (role.built_in) return
    if (!window.confirm(`${t('Delete role')} ${role.name}?`)) return
    setError('')
    setMessage('')
    try {
      await tanseekApi.deleteAdminRole(role.id)
      setMessage(t('Role deleted.'))
      await load()
    } catch (err) {
      setError(err?.message || t('Could not delete this role.'))
    }
  }

  const customRoleCount = roles.filter(role => !role.built_in).length

  return (
    <div>
      <PageHeader
        eyebrow={t('SUPER ADMIN')}
        title={t('System administration')}
        description={t('Create staff accounts, assign roles and control which parts of Tanseek each role can access.')}
        actions={tab === 'accounts'
          ? <Button icon="plus" onClick={startNewAccount}>{t('Add account')}</Button>
          : <Button icon="plus" onClick={startNewRole}>{t('Add role')}</Button>}
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-tanseek-muted">{t('Accounts')}</p>
          <p className="mt-2 text-3xl font-bold text-tanseek-navy">{accounts.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-tanseek-muted">{t('Roles')}</p>
          <p className="mt-2 text-3xl font-bold text-tanseek-navy">{roles.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-tanseek-muted">{t('Custom roles')}</p>
          <p className="mt-2 text-3xl font-bold text-tanseek-navy">{customRoleCount}</p>
        </Card>
      </div>

      <div className="mb-5 flex gap-2 border-b border-tanseek-line">
        {[
          { id: 'accounts', label: 'Accounts', icon: 'people' },
          { id: 'roles', label: 'Roles & permissions', icon: 'shield' },
        ].map(item => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className={`inline-flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-bold transition ${tab === item.id ? 'border-tanseek-teal text-tanseek-navy' : 'border-transparent text-tanseek-muted hover:text-tanseek-navy'}`}
          >
            <Icon name={item.icon} size={18} />
            {t(item.label)}
          </button>
        ))}
      </div>

      {error && <div className="mb-5 rounded-brand-sm border border-tanseek-alert/30 bg-tanseek-alertSoft px-4 py-3 text-sm text-tanseek-alert">{error}</div>}
      {message && <div className="mb-5 rounded-brand-sm border border-tanseek-teal/25 bg-tanseek-tealSoft px-4 py-3 text-sm font-bold text-tanseek-navy">{message}</div>}

      {loading ? <LoadingBlock text={t('Loading system administration…')} /> : (
        <>
          {tab === 'accounts' && (
            <div className="grid gap-5 xl:grid-cols-[1.3fr_0.7fr]">
              <Card className="overflow-hidden">
                <div className="border-b border-tanseek-line px-5 py-4">
                  <h2 className="font-bold text-tanseek-navy">{t('Staff accounts')}</h2>
                  <p className="mt-1 text-xs text-tanseek-muted">{t('Accounts are staff-only. Students continue to use the public timetable without signing in.')}</p>
                </div>

                {accounts.length === 0 ? (
                  <div className="p-8 text-center text-sm text-tanseek-muted">{t('No staff accounts found.')}</div>
                ) : (
                  <div className="custom-scrollbar overflow-x-auto">
                    <table className="w-full min-w-[760px] text-left text-sm">
                      <thead className="bg-tanseek-canvas text-[11px] uppercase tracking-[0.08em] text-tanseek-muted">
                        <tr>
                          <th className="px-5 py-3">{t('User')}</th>
                          <th className="px-4 py-3">{t('Role')}</th>
                          <th className="px-4 py-3">{t('Department')}</th>
                          <th className="px-5 py-3 text-right">{t('Actions')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-tanseek-line">
                        {accounts.map(account => (
                          <tr key={account.id} className="hover:bg-tanseek-canvas/60">
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-brand-sm bg-tanseek-navySoft text-tanseek-navy"><Icon name="user" size={17} /></div>
                                <div className="min-w-0">
                                  <p className="font-bold text-tanseek-navy">{account.name}</p>
                                  <p className="mt-0.5 max-w-[260px] truncate text-xs text-tanseek-muted">{account.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4"><span className="rounded-brand-sm bg-tanseek-navySoft px-2.5 py-1 text-xs font-bold text-tanseek-navy">{account.role_label || account.role}</span></td>
                            <td className="px-4 py-4 text-xs text-tanseek-muted">{account.department_name || t('University-wide access')}</td>
                            <td className="px-5 py-4">
                              <div className="flex justify-end gap-2">
                                <button onClick={() => editAccount(account)} className="grid h-9 w-9 place-items-center rounded-brand-sm border border-tanseek-line bg-white text-tanseek-navy transition hover:bg-tanseek-canvas" title={t('Edit')}><Icon name="edit" size={16} /></button>
                                <button
                                  onClick={() => deleteAccount(account)}
                                  disabled={String(account.id) === String(currentUser?.id)}
                                  className="grid h-9 w-9 place-items-center rounded-brand-sm border border-tanseek-alert/25 bg-white text-tanseek-alert transition hover:bg-tanseek-alertSoft disabled:cursor-not-allowed disabled:opacity-35"
                                  title={String(account.id) === String(currentUser?.id) ? t('You cannot delete the account you are using.') : t('Delete account')}
                                ><Icon name="trash" size={16} /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>

              <Card className="h-fit p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.1em] text-tanseek-teal">{accountEditorOpen ? t(editingAccountId ? 'EDIT ACCOUNT' : 'NEW ACCOUNT') : t('ACCOUNT MANAGEMENT')}</p>
                    <h2 className="mt-1 text-lg font-bold text-tanseek-navy">{accountEditorOpen ? t(editingAccountId ? 'Edit account' : 'Create account') : t('Manage staff access')}</h2>
                  </div>
                  {accountEditorOpen && <button onClick={() => setAccountEditorOpen(false)} className="rounded p-1.5 text-tanseek-muted hover:bg-tanseek-canvas"><Icon name="x" size={18} /></button>}
                </div>

                {!accountEditorOpen ? (
                  <div className="mt-6 rounded-brand-sm bg-tanseek-canvas p-4 text-sm leading-6 text-tanseek-muted">
                    {t('Select an account to edit it, or create a new staff account and assign one of the available roles.')}
                    <Button className="mt-4 w-full" icon="plus" onClick={startNewAccount}>{t('Add account')}</Button>
                  </div>
                ) : (
                  <form onSubmit={saveAccount} className="mt-5 space-y-4">
                    <Field label={t('Full name')}>
                      <input value={accountForm.name} onChange={e => setAccountForm({ ...accountForm, name: e.target.value })} className="h-11 w-full rounded-brand-sm border border-tanseek-line bg-white px-3 text-sm text-tanseek-ink outline-none focus:border-tanseek-teal" />
                    </Field>
                    <Field label={t('University email')}>
                      <input dir="ltr" type="email" value={accountForm.email} onChange={e => setAccountForm({ ...accountForm, email: e.target.value })} className="h-11 w-full rounded-brand-sm border border-tanseek-line bg-white px-3 text-sm text-tanseek-ink outline-none focus:border-tanseek-teal" />
                    </Field>
                    <Field label={editingAccountId ? t('New password') : t('Initial password')} hint={editingAccountId ? t('Leave blank to keep the current password.') : ''}>
                      <input dir="ltr" type="password" value={accountForm.password} onChange={e => setAccountForm({ ...accountForm, password: e.target.value })} className="h-11 w-full rounded-brand-sm border border-tanseek-line bg-white px-3 text-sm text-tanseek-ink outline-none focus:border-tanseek-teal" />
                    </Field>
                    <Field label={t('Role')}>
                      <select value={accountForm.role} onChange={e => setAccountForm({ ...accountForm, role: e.target.value })} className="h-11 w-full rounded-brand-sm border border-tanseek-line bg-white px-3 text-sm text-tanseek-ink outline-none focus:border-tanseek-teal">
                        <option value="">{t('Select role')}</option>
                        {roles.map(role => <option key={role.id} value={role.id}>{role.name}</option>)}
                      </select>
                    </Field>
                    {selectedRole && <div className="rounded-brand-sm bg-tanseek-navySoft p-3 text-xs leading-5 text-tanseek-muted">{selectedRole.description || `${selectedRole.permissions?.length || 0} ${t('permissions')}`}</div>}
                    <Field label={t('Department / scope')}>
                      <input value={accountForm.department_name} onChange={e => setAccountForm({ ...accountForm, department_name: e.target.value })} placeholder={t('University-wide access')} className="h-11 w-full rounded-brand-sm border border-tanseek-line bg-white px-3 text-sm text-tanseek-ink outline-none focus:border-tanseek-teal" />
                    </Field>
                    <div className="flex gap-2 pt-2">
                      <Button type="submit" disabled={saving} className="flex-1">{saving ? t('Saving…') : t(editingAccountId ? 'Save changes' : 'Create account')}</Button>
                      <Button type="button" variant="secondary" onClick={() => setAccountEditorOpen(false)}>{t('Cancel')}</Button>
                    </div>
                  </form>
                )}
              </Card>
            </div>
          )}

          {tab === 'roles' && (
            <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
              <Card className="overflow-hidden">
                <div className="border-b border-tanseek-line px-5 py-4">
                  <h2 className="font-bold text-tanseek-navy">{t('Roles & permissions')}</h2>
                  <p className="mt-1 text-xs text-tanseek-muted">{t('Built-in roles are protected. Custom roles can be edited or deleted when no accounts use them.')}</p>
                </div>
                <div className="divide-y divide-tanseek-line">
                  {roles.map(role => (
                    <div key={role.id} className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-bold text-tanseek-navy">{role.name}</h3>
                            {role.built_in && <span className="rounded-full bg-tanseek-navySoft px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-tanseek-muted">{t('Built-in')}</span>}
                          </div>
                          <p className="mt-1 text-xs leading-5 text-tanseek-muted">{role.description || t('No description')}</p>
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {(role.permissions || []).map(permission => (
                              <span key={permission} className="rounded-brand-sm border border-tanseek-line bg-tanseek-canvas px-2 py-1 text-[10px] font-bold text-tanseek-muted">{t(PERMISSION_OPTIONS.find(item => item.id === permission)?.label || permission)}</span>
                            ))}
                          </div>
                        </div>
                        {!role.built_in && (
                          <div className="flex shrink-0 gap-2">
                            <button onClick={() => editRole(role)} className="grid h-9 w-9 place-items-center rounded-brand-sm border border-tanseek-line bg-white text-tanseek-navy hover:bg-tanseek-canvas" title={t('Edit')}><Icon name="edit" size={16} /></button>
                            <button onClick={() => deleteRole(role)} className="grid h-9 w-9 place-items-center rounded-brand-sm border border-tanseek-alert/25 bg-white text-tanseek-alert hover:bg-tanseek-alertSoft" title={t('Delete role')}><Icon name="trash" size={16} /></button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="h-fit p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.1em] text-tanseek-teal">{roleEditorOpen ? t(editingRoleId ? 'EDIT ROLE' : 'NEW ROLE') : t('ROLE BUILDER')}</p>
                    <h2 className="mt-1 text-lg font-bold text-tanseek-navy">{roleEditorOpen ? t(editingRoleId ? 'Edit custom role' : 'Create custom role') : t('Build permission sets')}</h2>
                  </div>
                  {roleEditorOpen && <button onClick={() => setRoleEditorOpen(false)} className="rounded p-1.5 text-tanseek-muted hover:bg-tanseek-canvas"><Icon name="x" size={18} /></button>}
                </div>

                {!roleEditorOpen ? (
                  <div className="mt-6 rounded-brand-sm bg-tanseek-canvas p-4 text-sm leading-6 text-tanseek-muted">
                    {t('Create a custom role, choose its permissions, then assign it to staff accounts.')}
                    <Button className="mt-4 w-full" icon="plus" onClick={startNewRole}>{t('Add role')}</Button>
                  </div>
                ) : (
                  <form onSubmit={saveRole} className="mt-5 space-y-4">
                    <Field label={t('Role name')}>
                      <input value={roleForm.name} onChange={e => setRoleForm({ ...roleForm, name: e.target.value })} className="h-11 w-full rounded-brand-sm border border-tanseek-line bg-white px-3 text-sm text-tanseek-ink outline-none focus:border-tanseek-teal" />
                    </Field>
                    <Field label={t('Description')}>
                      <textarea value={roleForm.description} onChange={e => setRoleForm({ ...roleForm, description: e.target.value })} rows="3" className="w-full resize-none rounded-brand-sm border border-tanseek-line bg-white px-3 py-2.5 text-sm text-tanseek-ink outline-none focus:border-tanseek-teal" />
                    </Field>
                    <Field label={t('Permissions')}>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {PERMISSION_OPTIONS.map(permission => {
                          const checked = roleForm.permissions.includes(permission.id)
                          return (
                            <button
                              type="button"
                              key={permission.id}
                              onClick={() => togglePermission(permission.id)}
                              className={`flex min-h-12 items-start gap-2 rounded-brand-sm border p-3 text-left text-xs transition ${checked ? 'border-tanseek-teal bg-tanseek-tealSoft text-tanseek-navy' : 'border-tanseek-line bg-white text-tanseek-muted hover:border-tanseek-teal/50'}`}
                            >
                              <span className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-sm border ${checked ? 'border-tanseek-teal bg-tanseek-teal text-white' : 'border-tanseek-line'}`}>{checked && <Icon name="check" size={11} />}</span>
                              <span className="font-bold">{t(permission.label)}</span>
                            </button>
                          )
                        })}
                      </div>
                    </Field>
                    <div className="flex gap-2 pt-2">
                      <Button type="submit" disabled={saving} className="flex-1">{saving ? t('Saving…') : t(editingRoleId ? 'Save role' : 'Create role')}</Button>
                      <Button type="button" variant="secondary" onClick={() => setRoleEditorOpen(false)}>{t('Cancel')}</Button>
                    </div>
                  </form>
                )}
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  )
}
