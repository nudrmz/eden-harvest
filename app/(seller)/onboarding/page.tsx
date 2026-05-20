"use client";

import Link from "next/link";
import { Camera, Check, CheckCircle2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { useTheme } from "@/components/layout/ThemeProvider";
import { DarkSelect } from "@/components/ui/DarkSelect";
import {
  browseCategories,
  getSellerVerificationChoices,
  sellerOnboardingCountries
} from "@/lib/mockData";
import { SELLER_PROFILE_STORAGE_KEY } from "@/lib/utils/constants";

const TOTAL_STEPS = 5;

const glassCard =
  "rounded-2xl bg-[rgba(10,20,10,0.88)] border border-[rgba(255,255,255,0.12)] shadow-[0_8px_24px_rgba(0,0,0,0.35)]";

const primaryBtn =
  "eden-btn-primary-solid w-full rounded-xl bg-[#1D9E75] py-3 text-center text-base font-semibold text-white shadow-[0_10px_28px_rgba(29,158,117,0.38)] disabled:cursor-not-allowed disabled:bg-[#178763] disabled:text-white/90 disabled:opacity-50";

export default function SellerOnboardingPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const textPrimary = isDark ? "text-white" : "text-[#1A1A18]";
  const textSecondary = isDark ? "text-[rgba(255,255,255,0.65)]" : "text-[#444441]";
  const textTertiary = isDark ? "text-[rgba(255,255,255,0.5)]" : "text-[#9C9C95]";
  const labelTone = isDark ? "text-[rgba(255,255,255,0.7)]" : "text-[#444441]";
  const inputClass = isDark
    ? "eden-field-input w-full rounded-xl border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.06)] text-sm text-white placeholder:text-[rgba(255,255,255,0.35)] focus:border-[#1D9E75] focus:outline-none"
    : "eden-field-input w-full rounded-xl border border-[rgba(0,0,0,0.1)] bg-white text-sm text-[#1A1A18] placeholder:text-[#9C9C95] focus:border-[#1D9E75] focus:outline-none";

  const [step, setStep] = useState(1);
  const [showSuccess, setShowSuccess] = useState(false);

  const [countryCode, setCountryCode] = useState<string>("");
  const [farmName, setFarmName] = useState("");
  const [stateRegion, setStateRegion] = useState("");
  const [localArea, setLocalArea] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [phoneDigits, setPhoneDigits] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [verificationChoiceId, setVerificationChoiceId] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedCountry = useMemo(
    () => sellerOnboardingCountries.find((c) => c.code === countryCode),
    [countryCode]
  );

  const stateOptions = useMemo(() => {
    if (!selectedCountry) return [{ value: "", label: "Select country first" }];
    return [
      { value: "", label: "Choose state / region" },
      ...selectedCountry.states.map((s) => ({ value: s, label: s }))
    ];
  }, [selectedCountry]);

  const verificationChoices = useMemo(
    () => (countryCode ? getSellerVerificationChoices(countryCode) : []),
    [countryCode]
  );

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreview(null);
      return;
    }
    const url = URL.createObjectURL(photoFile);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

  useEffect(() => {
    setVerificationChoiceId("");
    setDocumentNumber("");
  }, [countryCode]);

  const toggleCategory = (name: string) => {
    setSelectedCategories((prev) =>
      prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name]
    );
  };

  const canAdvanceStep1 = Boolean(countryCode);
  const canAdvanceStep2 =
    farmName.trim().length > 0 && stateRegion.length > 0 && localArea.trim().length > 0;
  const canAdvanceStep3 = selectedCategories.length > 0;
  const canAdvanceStep4 = phoneDigits.replace(/\D/g, "").length >= 7;

  const canSubmitStep5 =
    verificationChoiceId.length > 0 && documentNumber.trim().length > 0;

  const goNext = () => setStep((s) => Math.min(TOTAL_STEPS, s + 1));
  const goBack = () => setStep((s) => Math.max(1, s - 1));

  const handleSubmit = () => {
    if (!selectedCountry || !canSubmitStep5) return;
    const payload = {
      farmName: farmName.trim(),
      flag: selectedCountry.flag,
      countryCode: selectedCountry.code,
      countryName: selectedCountry.name,
      stateRegion,
      localArea: localArea.trim(),
      categories: selectedCategories,
      phoneE164: `${selectedCountry.phoneCode}${phoneDigits.replace(/\D/g, "")}`,
      verificationType: verificationChoiceId,
      documentNumber: documentNumber.trim(),
      submittedAt: Date.now()
    };
    try {
      sessionStorage.setItem(SELLER_PROFILE_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      /* ignore quota */
    }
    setShowSuccess(true);
  };

  const onPhotoPick = (files: FileList | null) => {
    const file = files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    setPhotoFile(file);
  };

  if (showSuccess) {
    return (
      <main className="eden-seller-shell font-body mx-auto flex min-h-screen w-full max-w-md flex-col bg-[#0f1f0f] px-4 pb-10 pt-12 text-white antialiased">
        <div className="flex flex-1 flex-col items-center justify-center px-2 text-center">
          <div className="eden-success-check mb-8 flex h-28 w-28 items-center justify-center rounded-full border-2 border-[#1D9E75] bg-[#1D9E75]/25 shadow-[0_12px_40px_rgba(29,158,117,0.35)]">
            <CheckCircle2 className="text-white" size={52} strokeWidth={2.2} />
          </div>
          <h1 className="font-heading text-2xl font-bold text-white">Application submitted!</h1>
          <p className="mt-3 max-w-[280px] text-sm leading-relaxed text-[rgba(255,255,255,0.7)]">
            We&apos;ll review your details within 48 hours. You&apos;ll receive an email once
            verified.
          </p>
          <Link href="/dashboard" className={`${primaryBtn} mt-10 font-semibold`}>
            Go to dashboard
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="eden-seller-shell font-body mx-auto min-h-screen w-full max-w-md bg-[#0f1f0f] pb-44 text-white antialiased">
      <div className="sticky top-0 z-10 border-b border-[rgba(255,255,255,0.1)] bg-[rgba(10,20,10,0.96)] px-4 pb-4 pt-5 backdrop-blur-xl">
        <div className="flex items-center justify-center gap-2.5">
          {Array.from({ length: TOTAL_STEPS }, (_, index) => {
            const n = index + 1;
            const filled = n <= step;
            return (
              <span
                key={n}
                className={`h-2 w-2 rounded-full transition-colors ${
                  filled ? "bg-[#1D9E75]" : "bg-[rgba(255,255,255,0.2)]"
                }`}
                aria-hidden
              />
            );
          })}
        </div>
        <div className="mt-3 flex justify-between text-[10px]" style={{ color: "rgba(255,255,255,0.72)" }}>
          <span style={{ color: "rgba(255,255,255,0.9)" }}>
            Step {step} of {TOTAL_STEPS}
          </span>
          <span style={{ color: "rgba(255,255,255,0.78)" }}>Seller onboarding</span>
        </div>
      </div>

      <div key={step} className="eden-step-panel px-4 pb-4 pt-6">
        {step === 1 ? (
          <>
            <h1 className={`font-heading text-xl font-semibold ${textPrimary}`}>
              Where is your farm based?
            </h1>
            <p className={`mt-1 text-sm ${textSecondary}`}>
              Select your African country
            </p>
            <div className="mt-6 grid grid-cols-3 gap-2">
              {sellerOnboardingCountries.map((country) => {
                const selected = countryCode === country.code;
                return (
                  <button
                    key={country.code}
                    type="button"
                    onClick={() => setCountryCode(country.code)}
                    className={`relative flex flex-col items-center gap-2 rounded-2xl px-2 py-3 text-center transition ${
                      selected
                        ? "border-2 border-[#1D9E75] bg-[rgba(29,158,117,0.15)]"
                        : "border border-[rgba(255,255,255,0.12)] bg-[rgba(10,20,10,0.88)] shadow-[0_8px_24px_rgba(0,0,0,0.35)] hover:bg-[rgba(14,26,14,0.92)]"
                    }`}
                  >
                    {selected ? (
                      <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#1D9E75] text-white">
                        <Check size={12} strokeWidth={3} />
                      </span>
                    ) : null}
                    <span
                      className={`text-3xl leading-none transition-transform ${
                        selected ? "scale-110" : "scale-100"
                      }`}
                    >
                      {country.flag}
                    </span>
                    <span
                      className={`text-[11px] font-medium leading-tight ${
                        selected
                          ? "text-white"
                          : isDark
                            ? "text-[rgba(255,255,255,0.65)]"
                            : "text-[#1A1A18]"
                      }`}
                    >
                      {country.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        ) : null}

        {step === 2 && selectedCountry ? (
          <>
            <h1 className={`font-heading text-xl font-semibold ${textPrimary}`}>
              Tell us about your farm produce
            </h1>
            <p className={`mt-1 text-sm ${textSecondary}`}>
              Details buyers will see on your profile
            </p>
            <div className="mt-6 space-y-4">
              <div>
                <label className={`mb-1.5 block text-[11px] ${labelTone}`}>
                  Farm/Business name
                </label>
                <input
                  className={inputClass}
                  value={farmName}
                  onChange={(e) => setFarmName(e.target.value)}
                  placeholder="e.g. Green Valley Cooperative"
                  autoComplete="organization"
                />
              </div>
              <div>
                <label className={`mb-1.5 block text-[11px] ${labelTone}`}>
                  State / region
                </label>
                <DarkSelect
                  value={stateRegion}
                  options={stateOptions}
                  onChange={setStateRegion}
                  placeholder="Choose state / region"
                  disabled={!selectedCountry}
                />
              </div>
              <div>
                <label className={`mb-1.5 block text-[11px] ${labelTone}`}>
                  Local area / district
                </label>
                <input
                  className={inputClass}
                  value={localArea}
                  onChange={(e) => setLocalArea(e.target.value)}
                  placeholder="Town, village, or district"
                  autoComplete="address-level3"
                />
              </div>
            </div>
          </>
        ) : null}

        {step === 3 ? (
          <>
            <h1 className={`font-heading text-xl font-semibold ${textPrimary}`}>
              What produce do you sell?
            </h1>
            <p className={`mt-1 text-sm ${textSecondary}`}>Select all that apply</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {browseCategories.map((cat) => {
                const active = selectedCategories.includes(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleCategory(cat)}
                    className={`rounded-full border px-3 py-2 text-xs font-medium transition ${
                      active
                        ? "border-[#1D9E75] bg-[#1D9E75] text-white shadow-[0_6px_16px_rgba(29,158,117,0.35)]"
                        : isDark
                          ? "border-[rgba(255,255,255,0.12)] bg-[rgba(10,20,10,0.88)] text-[rgba(255,255,255,0.88)]"
                          : "border-[rgba(0,0,0,0.08)] bg-[#F0EDE6] text-[#1A1A18]"
                    }`}
                    style={!active && !isDark ? { textShadow: "none" } : undefined}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </>
        ) : null}

        {step === 4 && selectedCountry ? (
          <>
            <h1 className={`font-heading text-xl font-semibold ${textPrimary}`}>
              Contact & farm photo
            </h1>
            <p className={`mt-1 text-sm ${textSecondary}`}>
              Buyers reach you on WhatsApp — keep this number active
            </p>
            <div className="mt-6 space-y-4">
              <div>
                <label className={`mb-1.5 block text-[11px] ${labelTone}`}>
                  WhatsApp number
                </label>
                <div className="flex gap-2">
                  <div
                    className={`${glassCard} flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-[rgba(255,255,255,0.95)]`}
                  >
                    <span className="text-lg">{selectedCountry.flag}</span>
                    <span className={isDark ? "text-[rgba(255,255,255,0.85)]" : "text-[#1A1A18]"}>{selectedCountry.phoneCode}</span>
                  </div>
                  <input
                    className={`${inputClass} min-w-0 flex-1`}
                    inputMode="numeric"
                    value={phoneDigits}
                    onChange={(e) => setPhoneDigits(e.target.value.replace(/[^\d\s]/g, ""))}
                    placeholder="8012345678"
                    autoComplete="tel-national"
                  />
                </div>
                <p className="mt-2 text-[11px] leading-snug text-[rgba(159,225,203,0.95)]">
                  This WhatsApp number is how buyers will reach you
                </p>
              </div>

              <div>
                <label className={`mb-1.5 block text-[11px] ${labelTone}`}>
                  Farm photo
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => onPhotoPick(e.target.files)}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`${glassCard} flex min-h-[160px] w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[rgba(255,255,255,0.22)] px-4 py-8 transition hover:border-[#1D9E75]/60`}
                >
                  {photoPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={photoPreview}
                      alt="Farm preview"
                      className="max-h-32 w-full rounded-xl object-cover"
                    />
                  ) : (
                    <>
                      <Camera className="text-[rgba(255,255,255,0.55)]" size={32} />
                      <span className={`text-sm font-medium ${isDark ? "text-[rgba(255,255,255,0.85)]" : "text-[#1A1A18]"}`}>
                        Upload farm photo
                      </span>
                      <span className={`text-[11px] ${textTertiary}`}>
                        JPG or PNG — preview only
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        ) : null}

        {step === 5 && selectedCountry ? (
          <>
            <h1 className={`font-heading text-xl font-semibold ${textPrimary}`}>Verify your farm</h1>
            <p className={`mt-1 text-sm ${textSecondary}`}>
              Verified sellers get more enquiries and buyer trust
            </p>
            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              {verificationChoices.map((choice) => {
                const picked = verificationChoiceId === choice.id;
                return (
                  <button
                    key={choice.id}
                    type="button"
                    onClick={() => setVerificationChoiceId(choice.id)}
                    className={`${glassCard} rounded-2xl p-3 text-left transition hover:bg-[rgba(14,26,14,0.92)] ${
                      picked ? "border-2 border-[#1D9E75]" : ""
                    }`}
                  >
                    <p className={`text-sm font-semibold ${textPrimary}`}>{choice.title}</p>
                    {choice.subtitle ? (
                      <p className={`mt-1 text-[11px] ${textTertiary}`}>
                        {choice.subtitle}
                      </p>
                    ) : null}
                  </button>
                );
              })}
            </div>
            <div className="mt-5">
              <label className={`mb-1.5 block text-[11px] ${labelTone}`}>
                Document number / ID
              </label>
              <input
                className={inputClass}
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
                placeholder="Enter the number shown on your document"
              />
            </div>
            <p className={`mt-4 text-[11px] ${textTertiary}`}>
              Your verification will be reviewed within 48 hours
            </p>
          </>
        ) : null}
      </div>

      <div className="fixed bottom-[72px] left-1/2 z-30 w-full max-w-md -translate-x-1/2 px-4">
        <div className="relative flex items-center justify-center">
          {step > 1 ? (
            <button
              type="button"
              onClick={goBack}
              className={`absolute left-0 text-sm font-medium underline-offset-2 hover:underline ${
                isDark
                  ? "text-[rgba(255,255,255,0.72)] hover:text-white"
                  : "text-[#6B6B66] hover:text-[#1A1A18]"
              }`}
            >
              Back
            </button>
          ) : null}
          <div className="w-full max-w-[260px]">
            {step < TOTAL_STEPS ? (
              <button
                type="button"
                onClick={goNext}
                disabled={
                  (step === 1 && !canAdvanceStep1) ||
                  (step === 2 && !canAdvanceStep2) ||
                  (step === 3 && !canAdvanceStep3) ||
                  (step === 4 && !canAdvanceStep4)
                }
                className={primaryBtn}
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmitStep5}
                className={primaryBtn}
              >
                Submit application
              </button>
            )}
          </div>
        </div>
      </div>

      <MobileBottomNav active="sell" />
    </main>
  );
}
