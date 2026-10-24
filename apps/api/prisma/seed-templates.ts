import type { LocalizedText, TemplateDefinition } from '@egna-enelaklo/shared';

/**
 * The three live templates of the launch catalogue.
 *
 * The field labels are English for now: the Amharic and Oromo fall back to
 * English until the copy is reviewed (Phase 7). The service names, the
 * descriptions and the section titles are translated.
 */

export interface SeedService {
  description: {
    summary: LocalizedText;
    youProvide: LocalizedText[];
    youReceive: LocalizedText;
  };
  icon: string;
  key: string;
  name: LocalizedText;
  sortOrder: number;
  template: TemplateDefinition;
}

const subCityOptions = [
  { label: { en: 'Addis Ketema' }, value: 'ADDIS_KETEMA' },
  { label: { en: 'Akaky Kaliti' }, value: 'AKAKY_KALITI' },
  { label: { en: 'Arada' }, value: 'ARADA' },
  { label: { en: 'Bole' }, value: 'BOLE' },
  { label: { en: 'Gullele' }, value: 'GULLELE' },
  { label: { en: 'Kirkos' }, value: 'KIRKOS' },
  { label: { en: 'Kolfe Keranio' }, value: 'KOLFE_KERANIO' },
  { label: { en: 'Lemi Kura' }, value: 'LEMI_KURA' },
  { label: { en: 'Lideta' }, value: 'LIDETA' },
  { label: { en: 'Nifas Silk-Lafto' }, value: 'NIFAS_SILK_LAFTO' },
  { label: { en: 'Yeka' }, value: 'YEKA' },
];

export const SEED_SERVICES: SeedService[] = [
  {
    key: 'buy_and_deliver',
    icon: 'shopping-bag',
    sortOrder: 1,
    name: {
      en: 'Buy and deliver',
      am: 'ገዝብ ገዝኝ በመግዢት አጋርጣሽ',
      om: 'Balaa qabeessi geessuu',
    },
    description: {
      summary: {
        en: 'A tasker buys the items you list within your budget and delivers them to you.',
        am: 'ታሰራሽ እርስዎን በገደብ ውስጥ በመግዢት አድርጎ ያደርስዎታል።',
        om: 'Hojietsuun balaa kooti keessatti qabee geessii hojii itti fufi.',
      },
      youProvide: [
        { en: 'A list of the items you need' },
        { en: 'The maximum amount you want to spend' },
        { en: 'Where it has to be delivered' },
      ],
      youReceive: {
        en: 'The items at your door, with the receipt',
        am: 'የግዢቱ በደረጃዎ በእጭት፣ ከደረሰኛ ጋር',
        om: 'N barbaa dhugamee ragaa dhugaa',
      },
    },
    template: {
      requiredEvidence: ['DELIVERY_PHOTO', 'RECEIPT_PHOTO'],
      sections: [
        {
          key: 'items',
          title: { en: 'Items to buy', am: 'የሚገዙት ምርቶች' },
          fields: [
            {
              key: 'items',
              type: 'repeater',
              label: { en: 'Items to buy' },
              help: { en: 'Add every item with the quantity you need.' },
              required: true,
              rowLabel: { en: 'Item' },
              fields: [
                {
                  key: 'name',
                  type: 'text',
                  label: { en: 'Item' },
                  required: true,
                  placeholder: { en: 'For example: 2 kg rice' },
                },
                {
                  key: 'quantity',
                  type: 'number',
                  label: { en: 'Quantity' },
                  required: true,
                  min: 1,
                },
                {
                  key: 'notes',
                  type: 'text',
                  label: { en: 'Notes for the tasker' },
                  required: false,
                },
              ],
            },
            {
              key: 'referencePhoto',
              type: 'file',
              label: { en: 'Reference photo (optional)' },
              help: {
                en: 'A photo of the item or its packaging, so the tasker finds exactly what you mean. JPG or PNG, up to 5 MB.',
              },
              required: false,
              allowedTypes: ['image/jpeg', 'image/png'],
              maxMb: 5,
            },
          ],
        },
        {
          key: 'budget',
          title: { en: 'Budget and shop', am: 'ገደብና ድሳት' },
          fields: [
            {
              key: 'budget',
              type: 'money',
              label: { en: 'Purchase budget (maximum)' },
              help: {
                en: 'The tasker cannot spend more than this without your approval. You pay the receipt amount, not the budget.',
              },
              required: true,
              min: 50,
              max: 50_000,
              mapsTo: 'budgetCap',
            },
            {
              key: 'preferredShop',
              type: 'text',
              label: { en: 'Preferred shop' },
              required: false,
              placeholder: { en: 'For example: Bole Mall' },
            },
            {
              key: 'allowOtherShop',
              type: 'checkbox',
              label: { en: 'The tasker may use another shop' },
              required: false,
              defaultValue: true,
            },
          ],
        },
        {
          key: 'delivery',
          title: { en: 'Delivery', am: 'ማዕድ' },
          fields: [
            {
              key: 'deliveryAddress',
              type: 'address',
              label: { en: 'Delivery address' },
              required: true,
              mapsTo: 'deliveryAddress',
            },
            {
              key: 'contactPhone',
              type: 'phone',
              label: { en: 'Phone number of the person who receives it' },
              required: true,
              mapsTo: 'contactPhone',
            },
            {
              key: 'neededBy',
              type: 'datetime',
              label: { en: 'Needed by' },
              required: true,
              mapsTo: 'deadline',
            },
            {
              key: 'notes',
              type: 'textarea',
              label: { en: 'Anything else the tasker should know' },
              required: false,
            },
          ],
        },
      ],
    },
  },
  {
    key: 'queue_and_paperwork',
    icon: 'file-text',
    sortOrder: 2,
    name: {
      en: 'Queue and paperwork',
      am: 'በሰልፍ መስፈርት',
      om: 'Tarreeffata qabu',
    },
    description: {
      summary: {
        en: 'A tasker waits in line for you, or submits and collects documents at an office.',
        am: 'ታሰራሽ በመስፈርት ተራብሮ ይጠብቃል ወይም ሰነድ ያስገባል።',
        om: 'Hojietsuun tarreeffata kee hojii hojjetu.',
      },
      youProvide: [
        { en: 'The office and the paperwork you need' },
        { en: 'An authorization letter when the office asks for one' },
        { en: 'A phone number we can reach you on' },
      ],
      youReceive: {
        en: 'The documents, collected and handed over',
        am: 'ሰነዶች፣ ተሰብስበው ተረክተው',
        om: 'Galmeewwan qabii dabarsii',
      },
    },
    template: {
      requiredEvidence: ['COMPLETION_PHOTO'],
      sections: [
        {
          key: 'office',
          title: { en: 'Office and paperwork', am: 'ቢሮናና ሰነድ' },
          fields: [
            {
              key: 'officeType',
              type: 'select',
              label: { en: 'Type of office' },
              required: true,
              options: [
                { label: { en: 'Kebele' }, value: 'KEBELE' },
                { label: { en: 'Licensing office' }, value: 'LICENSING' },
                { label: { en: 'Bank' }, value: 'BANK' },
                { label: { en: 'Other government office' }, value: 'GOVERNMENT' },
                { label: { en: 'Other' }, value: 'OTHER' },
              ],
            },
            {
              key: 'officeName',
              type: 'text',
              label: { en: 'Name of the office' },
              required: true,
              placeholder: { en: 'For example: Kirkos sub city office' },
            },
            {
              key: 'officeSubCity',
              type: 'select',
              label: { en: 'Sub-city of the office' },
              required: false,
              options: subCityOptions,
            },
            {
              key: 'procedure',
              type: 'textarea',
              label: { en: 'What should be done' },
              help: { en: 'Describe what the tasker has to do at the office.' },
              required: true,
            },
            {
              key: 'documents',
              type: 'repeater',
              label: { en: 'Documents' },
              required: false,
              rowLabel: { en: 'Document' },
              fields: [
                {
                  key: 'documentName',
                  type: 'text',
                  label: { en: 'Document' },
                  required: true,
                },
                {
                  key: 'details',
                  type: 'text',
                  label: { en: 'Details' },
                  required: false,
                },
              ],
            },
            {
              key: 'authorizationNeeded',
              type: 'select',
              label: { en: 'Does the office need an authorization letter?' },
              required: true,
              options: [
                { label: { en: 'Yes' }, value: 'YES' },
                { label: { en: 'No' }, value: 'NO' },
                { label: { en: 'Not sure' }, value: 'NOT_SURE' },
              ],
            },
            {
              key: 'authorizationLetter',
              type: 'file',
              label: { en: 'Authorization letter' },
              help: { en: 'A photo or a PDF of the signed letter. PDF, JPG or PNG, up to 5 MB.' },
              required: true,
              allowedTypes: ['application/pdf', 'image/jpeg', 'image/png'],
              maxMb: 5,
              showIf: { field: 'authorizationNeeded', equals: 'YES' },
            },
            {
              key: 'feesBudget',
              type: 'money',
              label: { en: 'Official fees (maximum)' },
              help: {
                en: 'Official fees the tasker may pay for you, if any',
              },
              required: false,
              min: 0,
              max: 50_000,
              mapsTo: 'budgetCap',
            },
            {
              key: 'contactPhone',
              type: 'phone',
              label: { en: 'Phone number' },
              required: true,
              mapsTo: 'contactPhone',
            },
            {
              key: 'preferredDate',
              type: 'date',
              label: { en: 'Preferred date' },
              required: true,
              mapsTo: 'deadline',
            },
            {
              key: 'notes',
              type: 'textarea',
              label: { en: 'Anything else' },
              required: false,
            },
          ],
        },
      ],
    },
  },
  {
    key: 'pickup_and_dropoff',
    icon: 'package',
    sortOrder: 3,
    name: {
      en: 'Pickup and drop-off',
      am: 'ንግድ አንቀሳቅስ አስረክት',
      om: 'Baadhata qabu dabarsuu',
    },
    description: {
      summary: {
        en: 'A tasker collects a parcel, a document or a key and delivers it somewhere else.',
        am: 'ታሰራሽ ንግድ፣ ሰነድ ወይም ቁልፍ ይሰብስባል አንድ ቦታ ያድርሳል።',
        om: 'Hojietsuun baadhata, galmee yookaan qabiyyee ol aana biraa geessii.',
      },
      youProvide: [
        { en: 'Where the item has to be picked up' },
        { en: 'Where it has to be delivered' },
        { en: 'Who to hand it over to' },
      ],
      youReceive: {
        en: 'The item, delivered with proof',
        am: 'ንግዱ፣ ከማረጋገጫ ጋር ተደርሷል',
        om: 'N barbaa, ragaa dhugaa',
      },
    },
    template: {
      requiredEvidence: ['DELIVERY_PHOTO', 'PICKUP_PHOTO'],
      sections: [
        {
          key: 'pickup',
          title: { en: 'Pickup', am: 'መውሰል' },
          fields: [
            {
              key: 'pickupAddress',
              type: 'address',
              label: { en: 'Pickup address' },
              required: true,
              mapsTo: 'pickupAddress',
            },
            {
              key: 'pickupContactName',
              type: 'text',
              label: { en: 'Name of the person who hands it over' },
              required: true,
            },
            {
              key: 'pickupContactPhone',
              type: 'phone',
              label: { en: 'Phone number at the pickup' },
              required: true,
            },
          ],
        },
        {
          key: 'dropoff',
          title: { en: 'Drop-off', am: 'ማስረክ' },
          fields: [
            {
              key: 'dropoffAddress',
              type: 'address',
              label: { en: 'Delivery address' },
              required: true,
              mapsTo: 'deliveryAddress',
            },
            {
              key: 'dropoffContactName',
              type: 'text',
              label: { en: 'Name of the person who receives it' },
              required: true,
            },
            {
              key: 'dropoffContactPhone',
              type: 'phone',
              label: { en: 'Phone number at the delivery' },
              required: true,
            },
          ],
        },
        {
          key: 'item',
          title: { en: 'The item', am: 'ንግዱ' },
          fields: [
            {
              key: 'itemType',
              type: 'select',
              label: { en: 'What are we moving?' },
              required: true,
              options: [
                { label: { en: 'Parcel' }, value: 'PARCEL' },
                { label: { en: 'Document' }, value: 'DOCUMENT' },
                { label: { en: 'Keys' }, value: 'KEYS' },
                { label: { en: 'Other' }, value: 'OTHER' },
              ],
            },
            {
              key: 'itemDescription',
              type: 'textarea',
              label: { en: 'Describe the item' },
              required: true,
            },
            {
              key: 'itemPhoto',
              type: 'file',
              label: { en: 'Photo of the item (optional)' },
              help: {
                en: 'A photo helps the tasker recognise it at the pickup. JPG or PNG, up to 5 MB.',
              },
              required: false,
              allowedTypes: ['image/jpeg', 'image/png'],
              maxMb: 5,
            },
            {
              key: 'packageSize',
              type: 'select',
              label: { en: 'Size' },
              required: true,
              options: [
                { label: { en: 'Fits in a bag' }, value: 'BAG' },
                { label: { en: 'Needs a box' }, value: 'BOX' },
                { label: { en: 'Large or heavy' }, value: 'LARGE' },
              ],
            },
            {
              key: 'declaredValue',
              type: 'money',
              label: { en: 'Declared value (optional)' },
              required: false,
              min: 0,
              max: 50_000,
            },
            {
              key: 'readyBy',
              type: 'datetime',
              label: { en: 'Ready to be picked up' },
              required: true,
              mapsTo: 'deadline',
            },
            {
              key: 'notes',
              type: 'textarea',
              label: { en: 'Anything else' },
              required: false,
            },
          ],
        },
      ],
    },
  },
];

/**
 * PENDING LEGAL REVIEW: this is an EXAMPLE list, not a legal opinion.
 * It only shows a warning to the customer and a flag to the staff.
 */
export const SEED_PROHIBITED_ITEMS: { note: string; term: string }[] = [
  { term: 'weapon', note: 'Weapons and ammunition are not allowed.' },
  { term: 'explosive', note: 'Explosives and ammunition are not allowed.' },
  { term: 'illegal drug', note: 'Illegal drugs are not allowed.' },
  { term: 'cash transfer', note: 'Taskers may not carry cash for you.' },
  { term: 'live animal', note: 'Live animals are not allowed.' },
  { term: 'counterfeit', note: 'Counterfeit goods are not allowed.' },
];
