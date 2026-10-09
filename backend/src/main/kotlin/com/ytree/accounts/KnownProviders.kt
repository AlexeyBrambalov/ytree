package com.ytree.accounts

import com.ytree.accounts.ProviderCategory.BANK
import com.ytree.accounts.ProviderCategory.INVESTMENT
import com.ytree.accounts.ProviderCategory.PENSION

/** The catalogue the client searches when adding providers. Fixed, so it lives in code. */
val KNOWN_PROVIDERS = listOf(
    Provider("barclays", "Barclays", BANK),
    Provider("hsbc", "HSBC", BANK),
    Provider("lloyds", "Lloyds", BANK),
    Provider("natwest", "NatWest", BANK),
    Provider("santander", "Santander", BANK),
    Provider("monzo", "Monzo", BANK),
    Provider("starling", "Starling", BANK),
    Provider("nationwide", "Nationwide", BANK),
    Provider("vanguard", "Vanguard", INVESTMENT),
    Provider("fidelity", "Fidelity", INVESTMENT),
    Provider("hargreaves-lansdown", "Hargreaves Lansdown", INVESTMENT),
    Provider("aj-bell", "AJ Bell", INVESTMENT),
    Provider("interactive-investor", "Interactive Investor", INVESTMENT),
    Provider("aviva", "Aviva", PENSION),
    Provider("legal-general", "Legal & General", PENSION),
    Provider("scottish-widows", "Scottish Widows", PENSION),
    Provider("royal-london", "Royal London", PENSION),
    Provider("standard-life", "Standard Life", PENSION),
    Provider("nest", "Nest", PENSION),
)
