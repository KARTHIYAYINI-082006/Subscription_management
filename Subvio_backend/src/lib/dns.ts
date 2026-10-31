import dns from 'node:dns';
import { env } from './env';

/**
 * Optional DNS fallback (enabled by DNS_SERVERS). If the system resolver fails — e.g. a network DNS that
 * refuses a domain — the hostname is resolved through the given public resolvers instead.
 * Only name resolution changes: TLS still verifies the certificate against the real hostname.
 */
if (env.dnsServers.length) {
  const resolver = new dns.Resolver();
  resolver.setServers(env.dnsServers);
  type Callback = (err: NodeJS.ErrnoException | null, address?: unknown, family?: number) => void;
  const systemLookup = dns.lookup as unknown as (host: string, opts: object, cb: Callback) => void;

  const fallbackLookup = (hostname: string, options: unknown, callback?: unknown) => {
    const cb = (typeof options === 'function' ? options : callback) as Callback;
    const opts = (typeof options === 'object' && options) || (typeof options === 'number' ? { family: options } : {});
    systemLookup(hostname, opts, (err, address, family) => {
      if (!err) return cb(null, address, family);
      resolver.resolve4(hostname, (fallbackErr, addresses) => {
        if (fallbackErr || !addresses.length) return cb(err);
        if ((opts as dns.LookupOptions).all) cb(null, addresses.map((a) => ({ address: a, family: 4 })));
        else cb(null, addresses[0], 4);
      });
    });
  };

  (dns as unknown as { lookup: typeof fallbackLookup }).lookup = fallbackLookup;
}
