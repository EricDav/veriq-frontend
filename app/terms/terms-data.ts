export type TermsBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'bullets'; items: string[] };

export type TermsItem = { heading: string; blocks: TermsBlock[] };
export type TermsSection = { id: string; title: string; items: TermsItem[] };

export const TERMS_CONTENT_VERSION = '2026-08-08';
export const TERMS_LAST_UPDATED = '8 August 2026';
export const TERMS_EFFECTIVE_DATE = '[Insert Launch Date]';

export const DEFAULT_TERMS_SECTIONS: TermsSection[] = [
  {
    "id": "general",
    "title": "General",
    "items": [
      {
        "heading": "1. About Veriq Property",
        "blocks": [
          {
            "type": "paragraph",
            "text": "Veriq Property is a property intelligence platform designed to help users make better property decisions before physical inspection."
          },
          {
            "type": "paragraph",
            "text": "The platform may provide or facilitate access to:"
          },
          {
            "type": "bullets",
            "items": [
              "Property listings and property previews;",
              "Property Intelligence reports;",
              "Street Intelligence;",
              "Listing freshness and availability signals;",
              "Agent identity and performance indicators;",
              "Property-related disclosures;",
              "Estimated move-in costs;",
              "Agent consultation and contact access;",
              "Community-contributed location intelligence;",
              "Property search and comparison tools; and",
              "Other related services introduced from time to time."
            ]
          },
          {
            "type": "paragraph",
            "text": "Veriq Property is not a property owner, landlord, real estate agency, property developer, valuer, surveyor, legal adviser, or guarantor of any property or transaction, unless expressly stated otherwise. Property transactions remain between users, agents, landlords, property owners, or other relevant third parties."
          }
        ]
      },
      {
        "heading": "2. Eligibility and User Accounts",
        "blocks": [
          {
            "type": "paragraph",
            "text": "You must be at least 18 years old and legally capable of entering into binding agreements to create an account or use paid services on Veriq Property."
          },
          {
            "type": "paragraph",
            "text": "You agree to provide accurate, current, and complete account information. You are responsible for maintaining the security of your account and for activities performed through your account."
          },
          {
            "type": "paragraph",
            "text": "You must not:"
          },
          {
            "type": "bullets",
            "items": [
              "Impersonate another person;",
              "Create fraudulent or misleading accounts;",
              "Share account access for abusive purposes;",
              "Use Veriq to commit fraud, harassment, deception, or other unlawful activity; or",
              "Attempt to interfere with the security or operation of the platform."
            ]
          },
          {
            "type": "paragraph",
            "text": "Veriq may request additional identity or account verification where necessary."
          }
        ]
      }
    ]
  },
  {
    "id": "property-listings",
    "title": "Property Listings and Intelligence",
    "items": [
      {
        "heading": "3. Property Listings",
        "blocks": [
          {
            "type": "paragraph",
            "text": "Property listings on Veriq may be submitted by independent agents, property professionals, owners, or other approved contributors."
          },
          {
            "type": "paragraph",
            "text": "Property listings may include:"
          },
          {
            "type": "bullets",
            "items": [
              "Property type;",
              "Location;",
              "Rent or price;",
              "Bedrooms and bathrooms;",
              "Images;",
              "Estimated charges and move-in costs;",
              "Property condition information;",
              "Availability information; and",
              "Other property-related details."
            ]
          },
          {
            "type": "paragraph",
            "text": "Agents and contributors are responsible for the accuracy of information they submit. Although Veriq may moderate, structure, review, or verify aspects of submitted information, Veriq does not guarantee that every listing is completely accurate, available, suitable, or free from error."
          },
          {
            "type": "paragraph",
            "text": "Users should independently inspect a property and confirm all important information before making payments, signing agreements, or committing to a transaction."
          }
        ]
      },
      {
        "heading": "4. Listing Availability and Freshness",
        "blocks": [
          {
            "type": "paragraph",
            "text": "Property availability can change quickly. Veriq may display freshness indicators showing when a property was last reconfirmed or updated."
          },
          {
            "type": "paragraph",
            "text": "Freshness or availability indicators may include:"
          },
          {
            "type": "bullets",
            "items": [
              "Availability Confirmed;",
              "Recently Confirmed;",
              "Active Listing;",
              "Expired Listing; or",
              "Other similar status indicators."
            ]
          },
          {
            "type": "paragraph",
            "text": "These indicators reflect information available to Veriq at the relevant time and are not a guarantee that the property remains available when the user contacts the agent or attends an inspection."
          },
          {
            "type": "paragraph",
            "text": "Agents may be required to reconfirm listings periodically. Listings that are not refreshed within Veriq's required timeframe may be automatically expired, hidden, flagged, or removed."
          }
        ]
      },
      {
        "heading": "5. Property Intelligence",
        "blocks": [
          {
            "type": "paragraph",
            "text": "Property Intelligence is designed to help users understand a property before deciding whether to physically inspect it."
          },
          {
            "type": "paragraph",
            "text": "A Property Intelligence report may include:"
          },
          {
            "type": "bullets",
            "items": [
              "Property photographs;",
              "Property condition;",
              "Electricity or utility information;",
              "Road or access information;",
              "Environmental observations;",
              "Property disclosures;",
              "Compound or neighbourhood observations;",
              "Agent observations;",
              "Estimated move-in costs; and",
              "Other structured information displayed by Veriq."
            ]
          },
          {
            "type": "paragraph",
            "text": "Property Intelligence is intended to support decision-making. It does not replace physical inspection, professional property inspection, legal due diligence, valuation, survey, title verification, or independent enquiries."
          },
          {
            "type": "paragraph",
            "text": "Users should always physically inspect a property and independently verify material information before making any payment, signing any agreement, or otherwise committing to a transaction."
          }
        ]
      },
      {
        "heading": "6. Intelligence Access and Unlock Fees",
        "blocks": [
          {
            "type": "paragraph",
            "text": "Certain Property Intelligence reports may require payment of an access fee. The applicable fee will be displayed before payment."
          },
          {
            "type": "paragraph",
            "text": "Payment grants the user access to the specified intelligence report for the period stated on the platform. Where applicable, access may be time-limited."
          },
          {
            "type": "paragraph",
            "text": "Payment for an intelligence report does not:"
          },
          {
            "type": "bullets",
            "items": [
              "Reserve the property;",
              "Guarantee that the property remains available;",
              "Constitute rent, agency fee, inspection fee, caution fee, legal fee, or property deposit;",
              "Guarantee that the user will rent or purchase the property; or",
              "Guarantee the outcome of an inspection."
            ]
          },
          {
            "type": "paragraph",
            "text": "Some properties may be made available through a Free Intelligence Unlock, promotional unlock, or similar offer. Eligibility and availability may vary, and such offers may be withdrawn at any time."
          }
        ]
      },
      {
        "heading": "7. Agent Contact and Consultation",
        "blocks": [
          {
            "type": "paragraph",
            "text": "Unlocking a Property Intelligence report may provide access to an agent's contact information or consultation feature. Agents are independent participants on the platform."
          },
          {
            "type": "paragraph",
            "text": "Veriq does not control the conduct of every interaction between agents and property seekers. Users and agents are responsible for communicating professionally and lawfully."
          },
          {
            "type": "paragraph",
            "text": "Any inspection arrangement, agent fee, transportation arrangement, tenancy negotiation, property payment, or other transaction occurring outside the Veriq platform remains the responsibility of the parties involved unless Veriq expressly states otherwise."
          }
        ]
      }
    ]
  },
  {
    "id": "street-intelligence",
    "title": "Street Intelligence",
    "items": [
      {
        "heading": "8. Street Intelligence",
        "blocks": [
          {
            "type": "paragraph",
            "text": "Street Intelligence is a community-powered location intelligence system designed to help users understand conditions around streets, estates, roads, and other recognised addressable locations."
          },
          {
            "type": "bullets",
            "items": [
              "Flood risk;",
              "Electricity;",
              "Network coverage;",
              "Noise;",
              "Security feel;",
              "Road access;",
              "Drainage;",
              "Environmental conditions; and",
              "Other location-related intelligence offered by Veriq."
            ]
          },
          {
            "type": "paragraph",
            "text": "Street Intelligence does not constitute professional engineering, environmental, security, legal, surveying, or valuation advice. Conditions can change over time. Users should make independent enquiries before relying on Street Intelligence for a property decision."
          }
        ]
      },
      {
        "heading": "9. Community Contributions and Voting",
        "blocks": [
          {
            "type": "paragraph",
            "text": "Street Intelligence may be contributed by eligible users familiar with a location. Veriq may require contributors to satisfy verification or eligibility requirements before their submissions are accepted."
          },
          {
            "type": "paragraph",
            "text": "Where sufficient eligible community contributions exist, Veriq uses its community voting system to determine the Street Intelligence result displayed for a particular location, subject to applicable moderation and data-quality rules."
          },
          {
            "type": "paragraph",
            "text": "The displayed result reflects the eligible community responses available to Veriq at the relevant time and should not be interpreted as an absolute fact, professional assessment, or guarantee."
          },
          {
            "type": "paragraph",
            "text": "Veriq may display information about the strength or status of Street Intelligence, including:"
          },
          {
            "type": "bullets",
            "items": [
              "Number of contributors;",
              "Confidence level;",
              "Date of latest update;",
              "Intelligence status; or",
              "Other indicators of data strength."
            ]
          },
          {
            "type": "paragraph",
            "text": "Veriq may moderate, reject, remove, suspend, or exclude contributions that appear fraudulent, abusive, manipulated, duplicated, irrelevant, misleading, or inconsistent with platform rules."
          }
        ]
      },
      {
        "heading": "10. Initial Street Intelligence",
        "blocks": [
          {
            "type": "paragraph",
            "text": "Where sufficient community contributions do not yet exist, Veriq may display initial or baseline intelligence prepared from available structured information and research."
          },
          {
            "type": "paragraph",
            "text": "Such information may be clearly identified as Initial Intelligence, Veriq Initial Intelligence, or similar wording."
          },
          {
            "type": "paragraph",
            "text": "Once Veriq’s required community contribution threshold is reached, the initial intelligence may be replaced or updated by the result determined through the community voting system."
          }
        ]
      },
      {
        "heading": "11. Street Intelligence Contributions",
        "blocks": [
          {
            "type": "paragraph",
            "text": "Contributors must provide information honestly and based on genuine familiarity with the relevant location."
          },
          {
            "type": "paragraph",
            "text": "Contributors must not:"
          },
          {
            "type": "bullets",
            "items": [
              "Submit information about locations they do not know;",
              "Manipulate voting outcomes;",
              "Create multiple accounts to influence results;",
              "Submit discriminatory, defamatory, abusive, or unlawful material;",
              "Coordinate false contributions;",
              "Misrepresent personal experience; or",
              "Attempt to intentionally damage or improve a location's intelligence score."
            ]
          },
          {
            "type": "paragraph",
            "text": "Veriq may restrict or terminate contribution privileges for abuse."
          }
        ]
      }
    ]
  },
  {
    "id": "agents",
    "title": "Agents",
    "items": [
      {
        "heading": "12. Agent Accounts and Verification",
        "blocks": [
          {
            "type": "paragraph",
            "text": "Agents may be required to provide identity, business, professional, or other verification information."
          },
          {
            "type": "paragraph",
            "text": "An Agent Verified, Identity Verified, or similar badge means only that the relevant verification requirement stated by Veriq has been completed."
          },
          {
            "type": "paragraph",
            "text": "An Agent Verified, Identity Verified, or similar badge does not mean that Veriq guarantees:"
          },
          {
            "type": "bullets",
            "items": [
              "The agent's character;",
              "Every property submitted by the agent;",
              "Future behaviour;",
              "Ownership of listed property; or",
              "Successful completion of any transaction."
            ]
          }
        ]
      },
      {
        "heading": "13. Agent Responsibilities",
        "blocks": [
          {
            "type": "paragraph",
            "text": "Agents must:"
          },
          {
            "type": "bullets",
            "items": [
              "Submit genuine properties;",
              "Provide accurate listing information;",
              "Use current and relevant property images;",
              "Disclose known material property information;",
              "Keep listing availability current;",
              "Respond professionally to users;",
              "Avoid misleading advertising;",
              "Remove or update unavailable properties;",
              "Comply with platform rules; and",
              "Comply with applicable laws and professional obligations."
            ]
          },
          {
            "type": "paragraph",
            "text": "Agents must not knowingly list or upload a property that is unavailable, fictitious, materially misrepresented, duplicated in a misleading manner, or outside their authority to market."
          }
        ]
      },
      {
        "heading": "14. Image and Content Standards",
        "blocks": [
          {
            "type": "paragraph",
            "text": "Agents and other contributors may only upload images or content they are authorised to use. Images must reasonably represent the relevant property."
          },
          {
            "type": "paragraph",
            "text": "Users must not upload:"
          },
          {
            "type": "bullets",
            "items": [
              "Stolen images;",
              "Unrelated property images;",
              "Misleading images;",
              "Manipulated images intended to deceive;",
              "Illegal content; or",
              "Content that infringes another person's intellectual property rights."
            ]
          },
          {
            "type": "paragraph",
            "text": "Veriq may remove content that violates these requirements."
          }
        ]
      },
      {
        "heading": "15. Agent Performance and Trust Signals",
        "blocks": [
          {
            "type": "paragraph",
            "text": "Veriq may calculate and display agent performance indicators."
          },
          {
            "type": "paragraph",
            "text": "Agent performance indicators may include:"
          },
          {
            "type": "bullets",
            "items": [
              "Listing accuracy;",
              "Listing freshness;",
              "Response reliability;",
              "Inspection success;",
              "Consultation history;",
              "User feedback;",
              "Listing availability performance; and",
              "Other relevant indicators."
            ]
          },
          {
            "type": "paragraph",
            "text": "Such indicators are generated from available platform data and should be treated as decision-support signals rather than guarantees of future performance. Veriq may modify the methodology used to calculate these indicators."
          }
        ]
      },
      {
        "heading": "16. Agent Consultation Earnings, Commissions and Withdrawals",
        "blocks": [
          {
            "type": "paragraph",
            "text": "Where Veriq shares intelligence-access or consultation revenue with listing agents, the applicable share may be determined by Veriq's current agent compensation rules."
          },
          {
            "type": "paragraph",
            "text": "Agent earnings may remain pending for a defined review period before becoming withdrawable."
          },
          {
            "type": "paragraph",
            "text": "Veriq may establish:"
          },
          {
            "type": "bullets",
            "items": [
              "Minimum withdrawal thresholds;",
              "Withdrawal limits;",
              "Withdrawal frequency;",
              "Payment verification requirements; and",
              "Other payout conditions."
            ]
          },
          {
            "type": "paragraph",
            "text": "Where a property is discovered to be unavailable, materially misleading, fraudulent, duplicated, or otherwise in violation of platform rules, related agent earnings may be reversed, withheld, deducted from pending balances, or otherwise adjusted in accordance with platform policy."
          }
        ]
      },
      {
        "heading": "17. Founding Agent or Special Status",
        "blocks": [
          {
            "type": "paragraph",
            "text": "Veriq may provide certain agents with special designations, including Founding Agent, Founding Verified Agent, partner status, promotional status, or similar recognition."
          },
          {
            "type": "paragraph",
            "text": "Such status does not create employment, partnership, agency, ownership, or permanent entitlement. Special status may be modified or revoked where an agent violates platform policies or no longer satisfies the applicable requirements."
          }
        ]
      }
    ]
  },
  {
    "id": "payments-refunds",
    "title": "Payments, Refunds and Credits",
    "items": [
      {
        "heading": "18. Payments",
        "blocks": [
          {
            "type": "paragraph",
            "text": "Payments may be processed through third-party payment service providers. By making a payment, you authorise Veriq and its payment partners to process the transaction."
          },
          {
            "type": "paragraph",
            "text": "Veriq may require payment verification before granting access to certain services. You are responsible for ensuring that the payment method used is authorised."
          }
        ]
      },
      {
        "heading": "19. Refund Protection and Credits",
        "blocks": [
          {
            "type": "paragraph",
            "text": "Where a user pays to unlock Property Intelligence and the listing agent later confirms that the property is no longer available, the agent may submit a refund request through Veriq on behalf of the affected user."
          },
          {
            "type": "paragraph",
            "text": "Once the refund request is reviewed and approved by Veriq, the applicable refund or credit will be processed automatically to the user. The user does not need to submit a separate refund request for an approved agent-initiated refund."
          },
          {
            "type": "paragraph",
            "text": "Depending on the applicable Refund Policy, an approved refund may result in:"
          },
          {
            "type": "paragraph",
            "text": "A Veriq wallet credit;"
          },
          {
            "type": "paragraph",
            "text": "A replacement unlock;"
          },
          {
            "type": "paragraph",
            "text": "Credit toward another eligible available property; or"
          },
          {
            "type": "paragraph",
            "text": "Another remedy expressly provided by Veriq."
          },
          {
            "type": "paragraph",
            "text": "Refund protection may also apply where Veriq determines that:"
          },
          {
            "type": "paragraph",
            "text": "The property was already unavailable at the time of the unlock;"
          },
          {
            "type": "paragraph",
            "text": "The listing was materially stale;"
          },
          {
            "type": "paragraph",
            "text": "A duplicate listing resulted in an improper paid unlock;"
          },
          {
            "type": "paragraph",
            "text": "The listing contained serious material misrepresentation; or"
          },
          {
            "type": "paragraph",
            "text": "Another qualifying circumstance is covered by the Refund Policy."
          },
          {
            "type": "paragraph",
            "text": "A refund does not automatically arise merely because a property later becomes unavailable. The applicable agent must notify Veriq of the unavailability and submit the required refund request, or Veriq must otherwise identify a qualifying issue through its review or moderation processes."
          },
          {
            "type": "paragraph",
            "text": "Veriq may review the listing, unlock record, timing of the unavailability, agent submission, and any other relevant information before approving a refund or credit."
          },
          {
            "type": "paragraph",
            "text": "Once approved, the refund or credit will be applied automatically in accordance with the current Refund Policy. The Refund Policy, as published on the platform, forms part of these Terms."
          }
        ]
      }
    ]
  },
  {
    "id": "user-conduct",
    "title": "User Conduct",
    "items": [
      {
        "heading": "20. Acceptable Use",
        "blocks": [
          {
            "type": "paragraph",
            "text": "Users must use Veriq lawfully and responsibly."
          },
          {
            "type": "paragraph",
            "text": "Users must not:"
          },
          {
            "type": "bullets",
            "items": [
              "Commit or facilitate fraud;",
              "Manipulate reviews, ratings, trust scores, votes, or contributions;",
              "Scrape or harvest platform data without permission;",
              "Attempt unauthorised access to another user's account;",
              "Introduce malicious software;",
              "Interfere with platform functionality;",
              "Use automated systems to abuse platform features;",
              "Harass users or agents;",
              "Circumvent payment or access controls;",
              "Copy paid intelligence for commercial redistribution; or",
              "Use Veriq in violation of applicable law."
            ]
          }
        ]
      },
      {
        "heading": "21. Intellectual Property",
        "blocks": [
          {
            "type": "paragraph",
            "text": "The Veriq name, logo, platform design, software, databases, intelligence structure, classifications, content arrangement, brand assets, and other proprietary materials belong to Veriq or its licensors."
          },
          {
            "type": "paragraph",
            "text": "Users receive a limited, personal, non-exclusive right to use the platform for its intended purpose."
          },
          {
            "type": "paragraph",
            "text": "Property information submitted by agents remains subject to applicable ownership rights, but users grant Veriq the rights reasonably necessary to host, display, moderate, process, and distribute submitted content through the platform."
          },
          {
            "type": "paragraph",
            "text": "Street Intelligence datasets, aggregated results, classifications, voting outputs, derived intelligence, and platform-generated data may form part of Veriq's proprietary database and platform systems, subject to applicable law."
          }
        ]
      }
    ]
  },
  {
    "id": "privacy-data",
    "title": "Privacy and Data",
    "items": [
      {
        "heading": "22. Privacy",
        "blocks": [
          {
            "type": "paragraph",
            "text": "Use of Veriq is also governed by the Veriq Privacy Policy."
          },
          {
            "type": "paragraph",
            "text": "Veriq may collect and process information as reasonably necessary to:"
          },
          {
            "type": "bullets",
            "items": [
              "Operate the platform;",
              "Create and manage accounts;",
              "Verify users or agents;",
              "Process payments;",
              "Improve platform security;",
              "Prevent fraud;",
              "Provide intelligence services;",
              "Operate community contribution systems;",
              "Communicate with users; and",
              "Improve the platform."
            ]
          },
          {
            "type": "paragraph",
            "text": "Users should review the Privacy Policy for further information."
          }
        ]
      }
    ]
  },
  {
    "id": "disclaimers-liability",
    "title": "Disclaimers and Liability",
    "items": [
      {
        "heading": "23. No Guarantee of Property or Transaction",
        "blocks": [
          {
            "type": "paragraph",
            "text": "Veriq provides information and platform tools intended to improve property decision-making."
          },
          {
            "type": "paragraph",
            "text": "Veriq does not guarantee:"
          },
          {
            "type": "bullets",
            "items": [
              "That a property is suitable for a particular user;",
              "That a property will remain available;",
              "That an agent or landlord will complete a transaction;",
              "That an inspection will be successful;",
              "That Street Intelligence conditions will remain unchanged;",
              "That community-supplied information will always be correct; or",
              "That a property transaction will be free from risk."
            ]
          },
          {
            "type": "paragraph",
            "text": "Users remain responsible for conducting appropriate inspections and due diligence."
          }
        ]
      },
      {
        "heading": "24. Independent Inspection and Due Diligence",
        "blocks": [
          {
            "type": "paragraph",
            "text": "Users should physically inspect properties before making commitments."
          },
          {
            "type": "paragraph",
            "text": "Where appropriate, users should independently verify:"
          },
          {
            "type": "bullets",
            "items": [
              "Ownership or title;",
              "Tenancy terms;",
              "Property condition;",
              "Building approvals;",
              "Security;",
              "Flood exposure;",
              "Utilities;",
              "Fees;",
              "Legal documents; and",
              "Any other information material to the transaction."
            ]
          },
          {
            "type": "paragraph",
            "text": "Veriq intelligence is decision-support information, not a substitute for independent professional advice or inspection."
          }
        ]
      },
      {
        "heading": "25. Limitation of Liability",
        "blocks": [
          {
            "type": "paragraph",
            "text": "To the maximum extent permitted by applicable law, Veriq Property and Veriq Global Services Ltd. shall not be liable for losses arising solely from:"
          },
          {
            "type": "bullets",
            "items": [
              "Failed property transactions;",
              "Property disputes;",
              "Misconduct by independent agents or landlords;",
              "Changes in listing availability;",
              "User reliance on community opinions;",
              "Conditions changing after intelligence was provided;",
              "Off-platform payments or transactions;",
              "Decisions made without appropriate inspection or due diligence; or",
              "Third-party services outside Veriq's control."
            ]
          },
          {
            "type": "paragraph",
            "text": "Nothing in these Terms excludes liability that cannot legally be excluded under applicable law."
          }
        ]
      }
    ]
  },
  {
    "id": "platform-rights",
    "title": "Platform Rights",
    "items": [
      {
        "heading": "26. Moderation and Enforcement",
        "blocks": [
          {
            "type": "paragraph",
            "text": "Veriq may review platform activity and enforce these Terms. Where reasonably necessary, Veriq may:"
          },
          {
            "type": "bullets",
            "items": [
              "Remove listings;",
              "Reject content;",
              "Restrict contributions;",
              "Suspend accounts;",
              "Remove verification badges;",
              "Adjust trust indicators;",
              "Withhold or reverse commissions;",
              "Disable payment features;",
              "Terminate access; or",
              "Take other reasonable protective action."
            ]
          },
          {
            "type": "paragraph",
            "text": "Serious or repeated violations may result in permanent removal from the platform."
          }
        ]
      },
      {
        "heading": "27. Changes to Platform Features",
        "blocks": [
          {
            "type": "paragraph",
            "text": "Veriq may add, modify, suspend, or discontinue platform features as the service develops."
          },
          {
            "type": "paragraph",
            "text": "This may include changes to:"
          },
          {
            "type": "bullets",
            "items": [
              "Intelligence categories;",
              "Pricing;",
              "Access periods;",
              "Free unlock programmes;",
              "Agent commissions;",
              "Trust systems;",
              "Street Intelligence voting thresholds;",
              "Eligibility requirements;",
              "Refund mechanisms; or",
              "Other platform functionality."
            ]
          },
          {
            "type": "paragraph",
            "text": "Where a change materially affects existing paid rights or obligations, Veriq will take reasonable steps to provide appropriate notice where required."
          }
        ]
      },
      {
        "heading": "28. Changes to These Terms",
        "blocks": [
          {
            "type": "paragraph",
            "text": "Veriq may update these Terms from time to time. The current version will be published on the platform with an updated effective date."
          },
          {
            "type": "paragraph",
            "text": "Where permitted by applicable law, continued use of Veriq after updated Terms take effect constitutes acceptance of the revised Terms. If a change requires separate consent, Veriq will request it where required."
          }
        ]
      },
      {
        "heading": "29. Suspension and Termination",
        "blocks": [
          {
            "type": "paragraph",
            "text": "Users may stop using Veriq at any time."
          },
          {
            "type": "paragraph",
            "text": "Veriq may suspend or terminate accounts for:"
          },
          {
            "type": "bullets",
            "items": [
              "Fraud;",
              "Abuse;",
              "Serious or repeated policy violations;",
              "False information;",
              "Manipulation of intelligence or voting systems;",
              "Payment abuse;",
              "Threats to platform security; or",
              "Other conduct that materially harms Veriq or its users."
            ]
          },
          {
            "type": "paragraph",
            "text": "Termination does not automatically remove obligations arising before termination."
          }
        ]
      },
      {
        "heading": "30. Related Policies",
        "blocks": [
          {
            "type": "paragraph",
            "text": "The Veriq Privacy Policy, Refund Policy, Agent Terms or Guidelines, and any other policy expressly incorporated by reference form part of these Terms where applicable. If there is a conflict between these Terms and a specific policy governing a particular feature or transaction, the more specific policy will apply to that feature or transaction to the extent of the conflict."
          }
        ]
      },
      {
        "heading": "31. Governing Law",
        "blocks": [
          {
            "type": "paragraph",
            "text": "These Terms shall be governed by the laws of the Federal Republic of Nigeria."
          },
          {
            "type": "paragraph",
            "text": "Users and Veriq should first attempt to resolve disputes in good faith through Veriq’s official support or legal contact channels. Any unresolved dispute shall be handled in accordance with applicable Nigerian law and any dispute-resolution procedure lawfully adopted and communicated by Veriq."
          }
        ]
      },
      {
        "heading": "32. Contact",
        "blocks": [
          {
            "type": "paragraph",
            "text": "Questions concerning these Terms may be sent through Veriq Property's official contact channels."
          },
          {
            "type": "paragraph",
            "text": "Veriq Global Services Ltd."
          },
          {
            "type": "paragraph",
            "text": "Veriq Property"
          },
          {
            "type": "paragraph",
            "text": "Website: veriqproperty.com"
          },
          {
            "type": "paragraph",
            "text": "Email: [Insert official support/legal email before publication]"
          }
        ]
      }
    ]
  }
];

