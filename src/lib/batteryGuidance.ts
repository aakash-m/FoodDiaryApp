// Phone makers whose battery savers are known to delay or block reminders for "idle" apps
// (dontkillmyapp.com). Menu names vary between OS versions, so the wording stays a little general.

export type BatteryGuidance = { brand: string; steps: string[] };

const GUIDES: { match: RegExp; guide: BatteryGuidance }[] = [
  {
    match: /vivo|iqoo/i,
    guide: {
      brand: 'iQOO / vivo',
      steps: [
        'Settings → Battery → Background power consumption management → Food Diary → Allow.',
        'Settings → Apps → Autostart (or App management) → turn on Food Diary.',
        'In recent apps, pull down on Food Diary to lock it.',
      ],
    },
  },
  {
    match: /samsung/i,
    guide: {
      brand: 'Samsung',
      steps: [
        'Settings → Apps → Food Diary → Battery → Unrestricted.',
        'Settings → Battery → Background usage limits → make sure Food Diary is not in “Sleeping apps” or “Deep sleeping apps”.',
      ],
    },
  },
  {
    match: /xiaomi|redmi|poco/i,
    guide: {
      brand: 'Xiaomi',
      steps: ['Settings → Apps → Food Diary → Battery saver → No restrictions.', 'Settings → Apps → Food Diary → Autostart → on.'],
    },
  },
  {
    match: /oneplus|oppo|realme/i,
    guide: {
      brand: 'OnePlus / OPPO / realme',
      steps: ['Settings → Apps → Food Diary → Battery → Allow background activity.', 'Settings → Apps → Food Diary → Auto launch → on.'],
    },
  },
  {
    match: /huawei|honor/i,
    guide: {
      brand: 'Huawei / Honor',
      steps: ['Settings → Battery → App launch → Food Diary → Manage manually, with all three switches on.'],
    },
  },
];

/** Guidance for phones with aggressive battery savers; null for stock Android (e.g. Pixel). */
export function batteryGuidance(manufacturer: string | null, brand: string | null): BatteryGuidance | null {
  const id = `${manufacturer ?? ''} ${brand ?? ''}`;
  return GUIDES.find((g) => g.match.test(id))?.guide ?? null;
}
