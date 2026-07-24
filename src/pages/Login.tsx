import { Navigate, useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { useStore } from '@/store';
import { cn } from '@/lib/utils';

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

/** Chrome-less sign-in — pick an identity; role & tenant follow the person. */
export default function Login() {
  const navigate = useNavigate();
  const sessionUserId = useStore((s) => s.sessionUserId);
  const people = useStore((s) => s.people);
  const tenants = useStore((s) => s.tenants);
  const signIn = useStore((s) => s.signIn);

  if (sessionUserId) return <Navigate to="/today" replace />;

  const enter = (personId: string) => {
    signIn(personId);
    navigate('/today', { replace: true });
  };

  return (
    <div className="grain flex min-h-[100dvh] items-center justify-center bg-canvas px-6 text-text-1">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="w-full max-w-[720px]"
      >
        <div className="mb-10 flex flex-col items-center gap-3 text-center">
          <img src="/logo.svg" alt="Fraytline" className="h-8 w-auto" />
          <h1 className="font-display text-h1 text-text-1">Sign in to Fraytline</h1>
          <p className="text-body text-text-2">
            Prototype access — pick an identity. Your role shapes what you can see and do;
            everything you do is written to the audit ledger.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {tenants.map((tenant, ti) => {
            const staff = people.filter((p) => p.tenantId === tenant.id && p.role !== 'Partner');
            return (
              <motion.div
                key={tenant.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + ti * 0.1, duration: 0.4, ease: EASE }}
                className="rounded-panel border border-line-hairline bg-surface-1 p-5"
              >
                <div className="mb-4 flex items-center gap-3">
                  <img src={tenant.logo} alt="" className="h-6 w-auto rounded" />
                  <div>
                    <div className="text-body-strong text-text-1">{tenant.name}</div>
                    <div className="text-caption text-text-3">{tenant.hq} · {tenant.descriptor}</div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {staff.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => enter(p.id)}
                      className={cn(
                        'group flex w-full items-center gap-3 rounded-card border border-line-hairline bg-surface-2/50 px-3 py-2.5',
                        'text-left transition-colors duration-150 hover:border-ember/50 hover:bg-surface-2',
                      )}
                    >
                      <img
                        src={p.avatar ?? '/avatar-wanjiru.png'}
                        alt=""
                        className="h-8 w-8 rounded-full border border-line-strong object-cover"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-small font-medium text-text-1">{p.name}</span>
                        <span className="block truncate text-caption text-text-3">{p.title ?? p.role}</span>
                      </span>
                      <span
                        className={cn(
                          'rounded-chip px-2 py-0.5 text-[10px] font-medium',
                          p.role === 'Owner' && 'bg-ember/15 text-ember',
                          p.role === 'Dispatcher' && 'bg-teal-dim text-teal',
                          p.role === 'Finance' && 'bg-ok/10 text-ok',
                          p.role === 'Driver' && 'bg-surface-3 text-text-2',
                        )}
                      >
                        {p.role}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 text-text-3 transition-transform group-hover:translate-x-0.5 group-hover:text-text-1" />
                    </button>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-8 flex items-center justify-center gap-2 text-caption text-text-3">
          <ShieldCheck className="h-3.5 w-3.5 text-teal" />
          Sessions, roles and every action are audit-logged · governed by tenant guardrails
        </div>
      </motion.div>
    </div>
  );
}
