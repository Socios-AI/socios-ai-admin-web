"use client";

import { useMemo, useState } from "react";
import {
  AsYouType,
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js";

const inputCls = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm";
const labelCls = "block text-sm font-medium mb-1";

const regionNames = new Intl.DisplayNames(["pt-BR"], { type: "region" });

// Lista de países (nome localizado + DDI), ordenada por nome. Construída uma vez.
function buildCountryOptions() {
  return getCountries()
    .map((code) => ({
      code,
      label: `${regionNames.of(code) ?? code} (+${getCountryCallingCode(code)})`,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
}

// Campo de telefone com seletor de país. Recebe/emite sempre E.164.
// Emite "" quando o número ainda não é possível pro país (não polui o estado pai).
export function PhoneField({
  valueE164,
  onChange,
  defaultCountry = "BR",
  labelText = "Telefone",
}: {
  valueE164: string;
  onChange: (e164: string) => void;
  defaultCountry?: CountryCode;
  labelText?: string;
}) {
  // Semente única a partir do valor inicial (não re-sincroniza pra não atropelar digitação).
  const seed = useMemo(
    () => (valueE164 ? parsePhoneNumberFromString(valueE164) : undefined),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const [country, setCountry] = useState<CountryCode>(seed?.country ?? defaultCountry);
  const [national, setNational] = useState<string>(seed ? seed.formatNational() : "");
  const options = useMemo(buildCountryOptions, []);

  function emit(raw: string, c: CountryCode) {
    const pn = parsePhoneNumberFromString(raw, c);
    onChange(pn && pn.isPossible() ? pn.number : "");
  }

  function onNationalChange(raw: string) {
    setNational(new AsYouType(country).input(raw));
    emit(raw, country);
  }

  function onCountryChange(c: CountryCode) {
    setCountry(c);
    setNational(new AsYouType(c).input(national));
    emit(national, c);
  }

  const pn = parsePhoneNumberFromString(national, country);
  const showWarning = national.length > 0 && (!pn || !pn.isPossible());

  return (
    <div>
      <label htmlFor="phone_national" className={labelCls}>{labelText}</label>
      <div className="flex gap-2">
        <select
          aria-label="País do telefone"
          value={country}
          onChange={(e) => onCountryChange(e.target.value as CountryCode)}
          className={`${inputCls} max-w-[12rem]`}
        >
          {options.map((o) => (
            <option key={o.code} value={o.code}>{o.label}</option>
          ))}
        </select>
        <input
          id="phone_national"
          inputMode="tel"
          autoComplete="tel-national"
          value={national}
          placeholder="(62) 3292-5602"
          onChange={(e) => onNationalChange(e.target.value)}
          className={inputCls}
        />
      </div>
      {showWarning && (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400">
          Número incompleto ou inválido para o país selecionado.
        </p>
      )}
    </div>
  );
}
