import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const templates = [
  {
    name: 'Onboarding Checklist',
    subject: 'Welcome to Clickk - Let\'s Get Started!',
    defaultBody: `Hi,

Thank you for choosing to work with Clickk. We're incredibly excited to have you onboard, so let's get this started. 

Firstly, we need to do a bit of housekeeping. 

Our team will issue an invoice with a deposit, before work is commenced. Can you please supply us with the following information: 
Accounts email 
Accounts contact 
ABN

Please note that we will issue an initial invoice before work is commenced and then a secondary invoice 4 weeks after the design revision. 

Please return the signed contract to myself

Once this has been completed, we can commence our kick off meeting. Here are a few times that work for us in the coming days

We'll need to organise a kick-off meeting at our office or via Google Hangout in which we will discuss the following:
Design & stylistic goals for the website
Develop a sitemap and navigation
Supply of content plan for text/images
Finalise key timelines and requirements from both sides.
Understand who manages your domain (and who your IT provider is)
Ensure your project stays on track and on time, to achieve your digital goals.

Please find a time that works for you here: https://calendar.app.google/g9U68f5YovC9bHmL7`,
    sections: [
      {
        sectionKey: 'accounts_info',
        label: 'Accounts Information Request',
        content: `Our team will issue an invoice with a deposit, before work is commenced. Can you please supply us with the following information: 
Accounts email 
Accounts contact 
ABN`,
        isDefault: true,
        orderIndex: 0,
      },
      {
        sectionKey: 'invoice_info',
        label: 'Invoice Information',
        content: `Please note that we will issue an initial invoice before work is commenced and then a secondary invoice 4 weeks after the design revision.`,
        isDefault: true,
        orderIndex: 1,
      },
      {
        sectionKey: 'contract_request',
        label: 'Contract Request',
        content: `Please return the signed contract to myself`,
        isDefault: true,
        orderIndex: 2,
      },
      {
        sectionKey: 'kickoff_meeting',
        label: 'Kick-off Meeting Details',
        content: `We'll need to organise a kick-off meeting at our office or via Google Hangout in which we will discuss the following:
Design & stylistic goals for the website
Develop a sitemap and navigation
Supply of content plan for text/images
Finalise key timelines and requirements from both sides.
Understand who manages your domain (and who your IT provider is)
Ensure your project stays on track and on time, to achieve your digital goals.

Please find a time that works for you here: https://calendar.app.google/g9U68f5YovC9bHmL7`,
        isDefault: true,
        orderIndex: 3,
      },
    ],
  },
  {
    name: 'Preparing for Kick off meeting',
    subject: 'Preparing for Your Kick-off Meeting',
    defaultBody: `Hi,

I will guide you through the design process, however these are a few things to consider before the meeting:

Examples of websites you like
Content on pages and information you'd like to include
Images and their position on the site

Who to bring?
Please bring key stakeholders in your organisation who will be contributing to the website build. Our team will identify a 'digital champion' - who will be our key point of contact throughout the website development process. This person will be responsible for gathering information about your organisation and helping us achieve your deliverables.

Please note that we will issue an initial invoice before work is commenced and then a secondary invoice 4 weeks after the design revision.

If you have any questions in between now and the meeting, please let me know.

Thank you`,
    sections: [
      {
        sectionKey: 'preparation_items',
        label: 'Things to Consider',
        content: `I will guide you through the design process, however these are a few things to consider before the meeting:

Examples of websites you like
Content on pages and information you'd like to include
Images and their position on the site`,
        isDefault: true,
        orderIndex: 0,
      },
      {
        sectionKey: 'who_to_bring',
        label: 'Who to Bring',
        content: `Please bring key stakeholders in your organisation who will be contributing to the website build. Our team will identify a 'digital champion' - who will be our key point of contact throughout the website development process. This person will be responsible for gathering information about your organisation and helping us achieve your deliverables.`,
        isDefault: true,
        orderIndex: 1,
      },
      {
        sectionKey: 'invoice_reminder',
        label: 'Invoice Reminder',
        content: `Please note that we will issue an initial invoice before work is commenced and then a secondary invoice 4 weeks after the design revision.`,
        isDefault: true,
        orderIndex: 2,
      },
    ],
  },
  {
    name: 'Post Kick-off Meeting',
    subject: 'Thank You for the Kick-off Meeting',
    defaultBody: `Hi,
 
Thanks for your time today in the kick-off meeting.

As discussed, I have attached a project checklist with all the information we need to complete the project. To ensure the project stays on track please send us this information as soon as possible.
 
Below I've outlined a few key dates to put in your calendar:
 
Website Draft Ready:        	[2 weeks after kick-off]
Revision Cycle:                   	[2 week after discovery]
Website Launch:                	[1 week after approval]
 
Images & Written Content
 
I have also attached a content writing guide to help you prepare written content.

Please upload the following content to this Google Drive folder: 

Images & Videos not currently on website
Logos
Written content in word document`,
    sections: [
      {
        sectionKey: 'key_dates',
        label: 'Key Dates',
        content: `Below I've outlined a few key dates to put in your calendar:
 
Website Draft Ready:        	[2 weeks after kick-off]
Revision Cycle:                   	[2 week after discovery]
Website Launch:                	[1 week after approval]`,
        isDefault: true,
        orderIndex: 0,
      },
      {
        sectionKey: 'content_upload',
        label: 'Content Upload Instructions',
        content: `I have also attached a content writing guide to help you prepare written content.

Please upload the following content to this Google Drive folder: 

Images & Videos not currently on website
Logos
Written content in word document`,
        isDefault: true,
        orderIndex: 1,
      },
    ],
  },
  {
    name: 'Ready for Revision',
    subject: 'Your Website is Ready for Review',
    defaultBody: `Hi,

I hope you have been having a great week.

Just letting you know your website is now ready for revision. To view the website click attached link: [DEV SITE LINK]

Could you please review the website and let me know if you have any modifications. If so we can organise a time this week to go through them either in person or via Google Hangout.

Kind regards`,
    sections: [
      {
        sectionKey: 'dev_site_link',
        label: 'Development Site Link',
        content: `Just letting you know your website is now ready for revision. To view the website click attached link: [DEV SITE LINK]`,
        isDefault: true,
        orderIndex: 0,
      },
      {
        sectionKey: 'revision_request',
        label: 'Revision Request',
        content: `Could you please review the website and let me know if you have any modifications. If so we can organise a time this week to go through them either in person or via Google Hangout.`,
        isDefault: true,
        orderIndex: 1,
      },
    ],
  },
  {
    name: 'Ready for Go Live',
    subject: 'Your Website is Ready to Launch!',
    defaultBody: `Hi,

Thank you for your input on the website design. Our team has been working hard behind the scenes making the changes and we are ready to launch! 

We will launch the site on: INSERT DATE

In regards to going live we will just need your IT provider's contact details if you have one, to manage the changing of DNS records.

If you don't have an IT provider, could you provide us with access to your DNS records to point the domain to our hosting.

Your site will be hosted on our Australian servers. 

Our plan includes 3 months of complimentary hosting. Thereafter, your hosting package will commence. 

Thank you and talk soon,`,
    sections: [
      {
        sectionKey: 'launch_date',
        label: 'Launch Date',
        content: `We will launch the site on: INSERT DATE`,
        isDefault: true,
        orderIndex: 0,
      },
      {
        sectionKey: 'dns_requirements',
        label: 'DNS Requirements',
        content: `In regards to going live we will just need your IT provider's contact details if you have one, to manage the changing of DNS records.

If you don't have an IT provider, could you provide us with access to your DNS records to point the domain to our hosting.`,
        isDefault: true,
        orderIndex: 1,
      },
      {
        sectionKey: 'hosting_info',
        label: 'Hosting Information',
        content: `Your site will be hosted on our Australian servers. 

Our plan includes 3 months of complimentary hosting. Thereafter, your hosting package will commence.`,
        isDefault: true,
        orderIndex: 2,
      },
    ],
  },
  {
    name: 'Ready for A record to IT',
    subject: 'DNS A Record Request for Website Launch',
    defaultBody: `Hi, 

We are working on behalf of INSERT CLIENT NAME and are ready to send their website live. 

Can you please point the www. and non www. A records for INSERT LIVE URL to INSERT A RECORD?

Please advise when this is complete.

Thank you in advance. 

Regards,`,
    sections: [
      {
        sectionKey: 'client_info',
        label: 'Client Information',
        content: `We are working on behalf of INSERT CLIENT NAME and are ready to send their website live.`,
        isDefault: true,
        orderIndex: 0,
      },
      {
        sectionKey: 'dns_request',
        label: 'DNS A Record Request',
        content: `Can you please point the www. and non www. A records for INSERT LIVE URL to INSERT A RECORD?`,
        isDefault: true,
        orderIndex: 1,
      },
    ],
  },
  {
    name: 'Congratulations on Launch',
    subject: 'Congratulations on the Launch of Your New Website!',
    defaultBody: `Hi,

Congratulations on the launch of your new website! 

INSERT LIVE URL

We have loved working with you and your organisation over the past few weeks. 

Please watch this video as it has everything you need to know! 
https://www.youtube.com/watch?v=oaHX5BMnNuc

Contact Form
We have sent a test enquiry to your contact form. It is imperative that you confirm you have received this. Sometimes email spam filters put the enquiries into the spam folder. Please confirm the form worked on your end!

In order to get the most out of your new site, we offer a training session via Google Hangout or in person at our office. 

https://calendly.com/clickk/60min

Resources
We also have a few resources which will help you with your new website. 
https://clickk.com.au/video-training/
Please advise of any emails you would like added to this website as a WordPress administrator. 

Google Analytics + Search Console
We have also setup Google Analytics & Search Console on your website. Please advise of the best gmail or Google Workspace email we can use to add you to your analytics. 

Support
Our team run a support desk which can be reached via help@clickk.com.au or on our office phone number 02 4036 3907. Please use these details as your first point of contact in the event you need any support or assistance for your website. The team is available Monday to Friday, 7:30am to 5pm.

If you have a moment, we would love to hear what you have to say about Clickk. Here is a link to give us a Google Review.

https://search.google.com/local/writereview?placeid=ChIJ8RWxNXsUc2sRaivllm-B_4Y

Talk soon,`,
    sections: [
      {
        sectionKey: 'live_url',
        label: 'Live Website URL',
        content: `Congratulations on the launch of your new website! 

INSERT LIVE URL`,
        isDefault: true,
        orderIndex: 0,
      },
      {
        sectionKey: 'video_intro',
        label: 'Introduction Video',
        content: `Please watch this video as it has everything you need to know! 
https://www.youtube.com/watch?v=oaHX5BMnNuc`,
        isDefault: true,
        orderIndex: 1,
      },
      {
        sectionKey: 'contact_form_test',
        label: 'Contact Form Test',
        content: `We have sent a test enquiry to your contact form. It is imperative that you confirm you have received this. Sometimes email spam filters put the enquiries into the spam folder. Please confirm the form worked on your end!`,
        isDefault: true,
        orderIndex: 2,
      },
      {
        sectionKey: 'training_session',
        label: 'Training Session',
        content: `In order to get the most out of your new site, we offer a training session via Google Hangout or in person at our office. 

https://calendly.com/clickk/60min`,
        isDefault: true,
        orderIndex: 3,
      },
      {
        sectionKey: 'resources',
        label: 'Resources',
        content: `We also have a few resources which will help you with your new website. 
https://clickk.com.au/video-training/
Please advise of any emails you would like added to this website as a WordPress administrator.`,
        isDefault: true,
        orderIndex: 4,
      },
      {
        sectionKey: 'analytics',
        label: 'Google Analytics & Search Console',
        content: `We have also setup Google Analytics & Search Console on your website. Please advise of the best gmail or Google Workspace email we can use to add you to your analytics.`,
        isDefault: true,
        orderIndex: 5,
      },
      {
        sectionKey: 'support',
        label: 'Support Information',
        content: `Our team run a support desk which can be reached via help@clickk.com.au or on our office phone number 02 4036 3907. Please use these details as your first point of contact in the event you need any support or assistance for your website. The team is available Monday to Friday, 7:30am to 5pm.`,
        isDefault: true,
        orderIndex: 6,
      },
      {
        sectionKey: 'review_request',
        label: 'Review Request',
        content: `If you have a moment, we would love to hear what you have to say about Clickk. Here is a link to give us a Google Review.

https://search.google.com/local/writereview?placeid=ChIJ8RWxNXsUc2sRaivllm-B_4Y`,
        isDefault: true,
        orderIndex: 7,
      },
    ],
  },
];

async function main() {
  console.log('Seeding email templates...');

  for (const templateData of templates) {
    const existing = await prisma.emailTemplate.findFirst({
      where: { name: templateData.name },
    });

    if (existing) {
      console.log(`Template "${templateData.name}" already exists, skipping...`);
      continue;
    }

    const template = await prisma.emailTemplate.create({
      data: {
        name: templateData.name,
        subject: templateData.subject,
        defaultBody: templateData.defaultBody,
        sections: {
          create: templateData.sections,
        },
      },
    });

    console.log(`Created template: ${template.name}`);
  }

  console.log('Email templates seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

