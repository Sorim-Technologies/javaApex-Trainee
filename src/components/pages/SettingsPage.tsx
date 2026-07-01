import { useEffect, useMemo, useRef, useState } from "react";
import apexLogo from "../../assets/apexlogo.png";
import "./SettingsPage.css";

type ThemeChoice = "light" | "dark" | "system";
type FontSizeChoice = "Small" | "Medium" | "Large";
type TimeFormatChoice = "12 Hour (AM/PM)" | "24 Hour";

type SectionKey =
  | "profile"
  | "appearance"
  | "language"
  | "notifications"
  | "about"
  | "system";

const tabs: Array<{ key: SectionKey; label: string; icon: string }> = [
  { key: "profile", label: "Profile Settings", icon: "P" },
  { key: "appearance", label: "Appearance", icon: "A" },
  { key: "language", label: "Language & Region", icon: "L" },
  { key: "notifications", label: "Notifications", icon: "N" },
  { key: "about", label: "About", icon: "I" },
  { key: "system", label: "System Information", icon: "S" },
];

const primaryColors = [
  { label: "Blue", className: "settings-color-dot--blue" },
  { label: "Purple", className: "settings-color-dot--purple" },
  { label: "Green", className: "settings-color-dot--green" },
  { label: "Orange", className: "settings-color-dot--orange" },
  { label: "Red", className: "settings-color-dot--red" },
  { label: "Teal", className: "settings-color-dot--teal" },
  { label: "Slate", className: "settings-color-dot--slate" },
];

const notificationDefaults = {
  emailNotifications: true,
  migrationCompleted: true,
  migrationFailed: true,
  weeklySummary: false,
  productUpdates: true,
};

const systemInfo = [
  { label: "Application Version", value: "1.0.0" },
  { label: "Environment", value: "Production", tone: "success" },
  { label: "Java Version", value: "17.0.10" },
  { label: "Server Time", value: "30 Jun 2026, 11:25 AM" },
  { label: "System Status", value: "Healthy", tone: "success" },
  { label: "Storage Used", value: "2.45 GB" },
  { label: "Last Updated", value: "30 Jun 2026, 10:45 AM" },
];

const APPEARANCE_STORAGE_KEY = "javapex_settings_appearance";
const REGION_STORAGE_KEY = "javapex_settings_region";

type AppearanceSettings = {
  selectedTheme: ThemeChoice;
  selectedColor: string;
  fontSize: FontSizeChoice;
  compactMode: boolean;
};

type RegionSettings = {
  language: string;
  dateFormat: string;
  timeFormat: TimeFormatChoice;
  timeZone: string;
  currency: string;
};

const defaultAppearanceSettings: AppearanceSettings = {
  selectedTheme: "light",
  selectedColor: "Blue",
  fontSize: "Medium",
  compactMode: false,
};

const defaultRegionSettings: RegionSettings = {
  language: "English (US)",
  dateFormat: "DD-MM-YYYY",
  timeFormat: "24 Hour",
  timeZone: "(UTC+05:30) Asia/Kolkata",
  currency: "INR (Rs) - Indian Rupee",
};

const readStoredSettings = <T,>(key: string, fallback: T): T => {
  if (typeof window === "undefined") return fallback;

  try {
    const storedValue = window.localStorage.getItem(key);
    return storedValue ? { ...fallback, ...(JSON.parse(storedValue) as Partial<T>) } : fallback;
  } catch {
    return fallback;
  }
};

const getLocale = (language: string) => {
  if (language === "English (UK)") return "en-GB";
  if (language === "Hindi") return "hi-IN";
  if (language === "German") return "de-DE";
  return "en-US";
};

const getTimeZoneId = (timeZone: string) => timeZone.match(/\)\s(.+)$/)?.[1] || "Asia/Kolkata";

const formatRegionalDateTime = (
  date: Date,
  { language, dateFormat, timeFormat, timeZone }: RegionSettings
) => {
  const parts = new Intl.DateTimeFormat(getLocale(language), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: timeFormat === "12 Hour (AM/PM)",
    timeZone: getTimeZoneId(timeZone),
  }).formatToParts(date);

  const readPart = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value || "";
  const dateParts = {
    day: readPart("day"),
    month: readPart("month"),
    year: readPart("year"),
  };
  const formattedDate =
    dateFormat === "MM-DD-YYYY"
      ? `${dateParts.month}-${dateParts.day}-${dateParts.year}`
      : dateFormat === "YYYY-MM-DD"
        ? `${dateParts.year}-${dateParts.month}-${dateParts.day}`
        : `${dateParts.day}-${dateParts.month}-${dateParts.year}`;
  const formattedTime = parts
    .filter((part) => ["hour", "minute", "dayPeriod", "literal"].includes(part.type))
    .map((part) => part.value)
    .join("")
    .trim();

  return `${formattedDate}, ${formattedTime}`;
};

function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      className={`settings-toggle${checked ? " settings-toggle--on" : ""}`}
      aria-pressed={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
    >
      <span />
    </button>
  );
}

export default function SettingsPage() {
  const sectionRefs = useRef<Record<SectionKey, HTMLElement | null>>({
    profile: null,
    appearance: null,
    language: null,
    notifications: null,
    about: null,
    system: null,
  });

  const [activeTab, setActiveTab] = useState<SectionKey>("profile");
  const [fullName, setFullName] = useState("John Doe");
  const [email, setEmail] = useState("admin@example.com");
  const [appearanceSettings, setAppearanceSettings] = useState<AppearanceSettings>(() =>
    readStoredSettings(APPEARANCE_STORAGE_KEY, defaultAppearanceSettings)
  );
  const [regionSettings, setRegionSettings] = useState<RegionSettings>(() =>
    readStoredSettings(REGION_STORAGE_KEY, defaultRegionSettings)
  );
  const [notifications, setNotifications] = useState(notificationDefaults);
  const [saveMessage, setSaveMessage] = useState("");
  const { selectedTheme, selectedColor, fontSize, compactMode } = appearanceSettings;
  const { language, dateFormat, timeFormat, timeZone, currency } = regionSettings;

  useEffect(() => {
    window.localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(appearanceSettings));
  }, [appearanceSettings]);

  useEffect(() => {
    window.localStorage.setItem(REGION_STORAGE_KEY, JSON.stringify(regionSettings));
  }, [regionSettings]);

  const renderedSystemInfo = useMemo(() => {
    const baseServerTime = new Date("2026-06-30T11:25:00+05:30");
    const baseLastUpdated = new Date("2026-06-30T10:45:00+05:30");

    return systemInfo.map((item) => {
      if (item.label === "Server Time") {
        return { ...item, value: formatRegionalDateTime(baseServerTime, regionSettings) };
      }
      if (item.label === "Last Updated") {
        return { ...item, value: formatRegionalDateTime(baseLastUpdated, regionSettings) };
      }
      return item;
    });
  }, [regionSettings]);

  const handleTabClick = (section: SectionKey) => {
    setActiveTab(section);
    sectionRefs.current[section]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleSave = () => {
    setSaveMessage("Settings saved successfully.");
    window.setTimeout(() => setSaveMessage(""), 2600);
  };

  const showAppliedMessage = (message: string) => {
    setSaveMessage(message);
    window.setTimeout(() => setSaveMessage(""), 2200);
  };

  const updateAppearance = <Key extends keyof AppearanceSettings>(
    key: Key,
    value: AppearanceSettings[Key]
  ) => {
    setAppearanceSettings((current) => ({ ...current, [key]: value }));
    showAppliedMessage("Appearance settings applied.");
  };

  const updateRegion = <Key extends keyof RegionSettings>(
    key: Key,
    value: RegionSettings[Key]
  ) => {
    setRegionSettings((current) => ({ ...current, [key]: value }));
    showAppliedMessage("Language and region settings applied.");
  };

  const updateNotification = (key: keyof typeof notificationDefaults, value: boolean) => {
    setNotifications((current) => ({ ...current, [key]: value }));
  };

  return (
    <div
      className={[
        "settings-page",
        `settings-page--theme-${selectedTheme}`,
        `settings-page--color-${selectedColor.toLowerCase()}`,
        `settings-page--font-${fontSize.toLowerCase()}`,
        compactMode ? "settings-page--compact" : "",
      ].filter(Boolean).join(" ")}
      lang={getLocale(language)}
    >
      <header className="settings-page__header">
        <h1>Settings</h1>
        <p>Manage your account preferences and application settings</p>
      </header>

      <nav className="settings-tabs" aria-label="Settings sections">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`settings-tab${activeTab === tab.key ? " settings-tab--active" : ""}`}
            onClick={() => handleTabClick(tab.key)}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </nav>

      {saveMessage && <div className="settings-save-message">{saveMessage}</div>}

      <main className="settings-grid">
        <section
          className="settings-card"
          ref={(element) => {
            sectionRefs.current.profile = element;
          }}
        >
          <div className="settings-card__header">
            <span className="settings-card__icon">P</span>
            <div>
              <h2>Profile Settings</h2>
              <p>Manage your personal information and account details</p>
            </div>
          </div>

          <div className="settings-profile-layout">
            <div className="settings-profile-summary">
              <div className="settings-avatar">
                <span>JD</span>
                <button type="button" aria-label="Change avatar">+</button>
              </div>
              <strong>John Doe</strong>
              <small>Administrator</small>
              <p>admin@example.com</p>
            </div>

            <div className="settings-form">
              <label>
                Full Name
                <input value={fullName} onChange={(event) => setFullName(event.target.value)} />
              </label>
              <label>
                Email Address
                <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
              </label>
              <label>
                Role
                <input value="Administrator" disabled />
              </label>
              <div className="settings-button-row settings-button-row--split">
                <button type="button" className="settings-secondary-button">Change Password</button>
                <button type="button" className="settings-primary-button" onClick={handleSave}>Save Changes</button>
              </div>
            </div>
          </div>
        </section>

        <section
          className="settings-card"
          ref={(element) => {
            sectionRefs.current.appearance = element;
          }}
        >
          <div className="settings-card__header">
            <span className="settings-card__icon settings-card__icon--purple">A</span>
            <div>
              <h2>Appearance</h2>
              <p>Customize the look and feel of the application</p>
            </div>
          </div>

          <div className="settings-field-group">
            <span className="settings-field-title">Theme</span>
            <div className="settings-theme-grid">
              {(["light", "dark", "system"] as ThemeChoice[]).map((theme) => (
                <button
                  key={theme}
                  type="button"
                  className={`settings-theme-card${selectedTheme === theme ? " settings-theme-card--selected" : ""}`}
                  onClick={() => updateAppearance("selectedTheme", theme)}
                >
                  <span className={`settings-theme-card__icon settings-theme-card__icon--${theme}`} />
                  <strong>{theme.charAt(0).toUpperCase() + theme.slice(1)}</strong>
                </button>
              ))}
            </div>
          </div>

          <div className="settings-field-group">
            <span className="settings-field-title">Primary Color</span>
            <div className="settings-color-row">
              {primaryColors.map((color) => (
                <button
                  key={color.label}
                  type="button"
                  className={`settings-color-dot ${color.className}${selectedColor === color.label ? " settings-color-dot--selected" : ""}`}
                  aria-label={`${color.label} primary color`}
                  onClick={() => updateAppearance("selectedColor", color.label)}
                />
              ))}
            </div>
          </div>

          <div className="settings-form">
            <label>
              Font Size
              <select value={fontSize} onChange={(event) => updateAppearance("fontSize", event.target.value as FontSizeChoice)}>
                <option>Small</option>
                <option>Medium</option>
                <option>Large</option>
              </select>
            </label>
          </div>

          <div className="settings-option-row">
            <div>
              <strong>Compact Mode</strong>
              <p>Reduce spacing for more content on screen</p>
            </div>
            <ToggleSwitch checked={compactMode} onChange={(value) => updateAppearance("compactMode", value)} label="Compact mode" />
          </div>
        </section>

        <section
          className="settings-card"
          ref={(element) => {
            sectionRefs.current.language = element;
          }}
        >
          <div className="settings-card__header">
            <span className="settings-card__icon settings-card__icon--violet">L</span>
            <div>
              <h2>Language &amp; Region</h2>
              <p>Set your preferred language and regional settings</p>
            </div>
          </div>

          <div className="settings-form">
            <label>
              Language
              <select value={language} onChange={(event) => updateRegion("language", event.target.value)}>
                <option>English (US)</option>
                <option>English (UK)</option>
                <option>Hindi</option>
                <option>German</option>
              </select>
            </label>
            <label>
              Date Format
              <select value={dateFormat} onChange={(event) => updateRegion("dateFormat", event.target.value)}>
                <option>DD-MM-YYYY</option>
                <option>MM-DD-YYYY</option>
                <option>YYYY-MM-DD</option>
              </select>
            </label>
          </div>

          <fieldset className="settings-radio-group">
            <legend>Time Format</legend>
            <label>
              <input
                type="radio"
                name="time-format"
                checked={timeFormat === "12 Hour (AM/PM)"}
                onChange={() => updateRegion("timeFormat", "12 Hour (AM/PM)")}
              />
              12 Hour (AM/PM)
            </label>
            <label>
              <input
                type="radio"
                name="time-format"
                checked={timeFormat === "24 Hour"}
                onChange={() => updateRegion("timeFormat", "24 Hour")}
              />
              24 Hour
            </label>
          </fieldset>

          <div className="settings-form">
            <label>
              Time Zone
              <select value={timeZone} onChange={(event) => updateRegion("timeZone", event.target.value)}>
                <option>(UTC+05:30) Asia/Kolkata</option>
                <option>(UTC+00:00) Europe/London</option>
                <option>(UTC-05:00) America/New_York</option>
                <option>(UTC+09:00) Asia/Tokyo</option>
              </select>
            </label>
            <label>
              Currency
              <select value={currency} onChange={(event) => updateRegion("currency", event.target.value)}>
                <option>INR (Rs) - Indian Rupee</option>
                <option>USD ($) - US Dollar</option>
                <option>EUR (EUR) - Euro</option>
                <option>GBP (GBP) - British Pound</option>
              </select>
            </label>
          </div>
        </section>

        <section
          className="settings-card"
          ref={(element) => {
            sectionRefs.current.notifications = element;
          }}
        >
          <div className="settings-card__header">
            <span className="settings-card__icon settings-card__icon--orange">N</span>
            <div>
              <h2>Notifications</h2>
              <p>Configure how and when you want to be notified</p>
            </div>
          </div>

          <div className="settings-notification-list">
            <div className="settings-option-row">
              <div><strong>Email Notifications</strong><p>Receive email alerts for important events</p></div>
              <ToggleSwitch checked={notifications.emailNotifications} onChange={(value) => updateNotification("emailNotifications", value)} label="Email notifications" />
            </div>
            <div className="settings-option-row">
              <div><strong>Migration Completed</strong><p>Notify when migration is completed successfully</p></div>
              <ToggleSwitch checked={notifications.migrationCompleted} onChange={(value) => updateNotification("migrationCompleted", value)} label="Migration completed notifications" />
            </div>
            <div className="settings-option-row">
              <div><strong>Migration Failed</strong><p>Notify when migration fails</p></div>
              <ToggleSwitch checked={notifications.migrationFailed} onChange={(value) => updateNotification("migrationFailed", value)} label="Migration failed notifications" />
            </div>
            <div className="settings-option-row">
              <div><strong>Weekly Summary</strong><p>Receive weekly migration summary</p></div>
              <ToggleSwitch checked={notifications.weeklySummary} onChange={(value) => updateNotification("weeklySummary", value)} label="Weekly summary notifications" />
            </div>
            <div className="settings-option-row">
              <div><strong>Product Updates</strong><p>Receive updates about new features and improvements</p></div>
              <ToggleSwitch checked={notifications.productUpdates} onChange={(value) => updateNotification("productUpdates", value)} label="Product update notifications" />
            </div>
          </div>
        </section>

        <section
          className="settings-card settings-card--centered"
          ref={(element) => {
            sectionRefs.current.about = element;
          }}
        >
          <div className="settings-card__header settings-card__header--left">
            <span className="settings-card__icon">I</span>
            <div>
              <h2>About</h2>
              <p>Learn more about Java Migration Accelerator</p>
            </div>
          </div>

          <div className="settings-about">
            <img src={apexLogo} alt="Java APEX" />
            <h3>Java Migration Accelerator</h3>
            <span className="settings-version-badge">Version 1.0.0</span>
            <p>An intelligent platform to analyze, plan, and migrate Java applications to modern versions with confidence.</p>
            <div className="settings-about-links">
              <a href="/docs">Documentation</a>
              <button type="button" onClick={() => window.dispatchEvent(new Event("open-support-modal"))}>Support</button>
              <a href="/privacy">Privacy Policy</a>
            </div>
            <small>(c) 2026 Sormi.ai. All rights reserved.</small>
          </div>
        </section>

        <section
          className="settings-card"
          ref={(element) => {
            sectionRefs.current.system = element;
          }}
        >
          <div className="settings-card__header">
            <span className="settings-card__icon settings-card__icon--indigo">S</span>
            <div>
              <h2>System Information</h2>
              <p>View system and environment details</p>
            </div>
          </div>

          <dl className="settings-system-list">
            {renderedSystemInfo.map((item) => (
              <div key={item.label}>
                <dt>{item.label}</dt>
                <dd className={item.tone === "success" ? "settings-system-list__success" : ""}>{item.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      </main>
    </div>
  );
}
