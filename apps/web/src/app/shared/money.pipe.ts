import { Pipe, PipeTransform } from '@angular/core';
import { formatMoney } from '@financehub/shared-utils';

/**
 * Formats an integer amount in minor units (cents) as a localized currency
 * string — the client-side counterpart of how the API stores money.
 *
 * Usage: `{{ account.balanceMinor | fhMoney: account.currency }}`
 */
@Pipe({ name: 'fhMoney' })
export class MoneyPipe implements PipeTransform {
  transform(amountMinor: number | null | undefined, currency = 'USD'): string {
    return formatMoney(amountMinor ?? 0, currency);
  }
}
