// Where to contact each BNPL provider about payment difficulty, and free debt advice.
// Checked against each organisation's own website on 25 Nov 2026 (sources in comments).
// Opening hours are left out where a provider's own pages disagreed with each other.

export const PROVIDER_HELP = {
  // klarna.com/uk/customer-service and klarna.com/uk/help/payments/i-need-support-to-manage-my-debt-...
  Klarna: {
    steps: 'In the Klarna app, tap Report a problem, then Financial support. You can also sign in and chat with them.',
    link: 'https://www.klarna.com/uk/help/payments/i-need-support-to-manage-my-debt-what-resources-are-available-to-me/',
    linkLabel: 'Klarna: support to manage your debt',
    phone: '0808 189 3333',
  },
  // clearpay.co.uk/en-GB/hardship and clearpay.co.uk/en-GB/help
  Clearpay: {
    steps: 'Use Help in the Clearpay app or their hardship form. They can adjust your schedule, waive late fees or set up a payment plan.',
    link: 'https://www.clearpay.co.uk/en-GB/hardship',
    linkLabel: 'Clearpay: financial hardship',
    phone: '020 4572 0628',
    hours: 'Mon–Fri 8am–7:30pm, Sat–Sun 9am–5:30pm',
  },
  // paypal.com/uk/cshelp/personal and the financial difficulty article (help1179)
  'PayPal Pay in 3': {
    steps: 'Go to the PayPal Help Centre and message them through the Message Centre or PayPal Assistant.',
    link: 'https://www.paypal.com/uk/cshelp/article/what-happens-if-i-get-into-financial-difficulty-does-paypal-offer-any-support-help1179',
    linkLabel: 'PayPal: financial difficulty support',
  },
  // zilch.com/uk/help and zilch.com/uk/contact
  Zilch: {
    steps: 'Use Live Chat in the Zilch app.',
    link: 'https://www.zilch.com/uk/help/',
    linkLabel: 'Zilch help centre',
    phone: '020 3405 9775',
  },
  Other: {
    steps: "Look for Help, Support or Contact us in your provider's app or website, and ask about support for customers who are struggling.",
  },
}

// stepchange.org/contact-us.aspx · nationaldebtline.org · moneyhelper.org.uk/en/contact-us
export const FREE_ADVICE = [
  {
    name: 'StepChange',
    url: 'https://www.stepchange.org/',
    phone: '0800 138 1111',
    hours: 'Mon–Fri 8am–8pm, Sat 9am–2pm',
  },
  {
    name: 'National Debtline',
    url: 'https://nationaldebtline.org/',
    phone: '0808 808 4000',
    hours: 'Mon–Fri 9am–8pm, Sat 9:30am–1pm',
  },
  {
    name: 'MoneyHelper',
    url: 'https://www.moneyhelper.org.uk/en/contact-us',
    phone: '0800 011 3797',
    hours: 'Mon–Fri 9am–5pm',
  },
]

// fca.org.uk/consumers/buy-now-pay-later
export const RIGHTS_NOTE = {
  text: 'Since 15 July 2026, the FCA regulates Buy Now Pay Later. If you’re struggling to repay, contact your lender: under FCA rules they need to provide you with support.',
  link: 'https://www.fca.org.uk/consumers/buy-now-pay-later',
}
