/* Actionables — seed data (v3 schema)
   No Owner layer. Projects are the top-level grouping.
   BCP / ICICI Bank / SCB Bank are the projects.
   SPOCs link directly to projects. */
'use strict';

window.buildSeed = function (nowTs) {
  function ts(iso, h) {
    var p = iso.split('-');
    return new Date(+p[0], +p[1] - 1, +p[2], h || 10, 0, 0).getTime();
  }
  var SEEDER = 'Yash';

  var projects = [
    { id: 'p1', name: 'BCP',       code: 'BCP'   },
    { id: 'p2', name: 'ICICI Bank', code: 'ICICI' },
    { id: 'p3', name: 'SCB Bank',  code: 'SCB'   }
  ];

  /* SPOCs are global — a person can be assigned across any project */
  var people = [
    { id: 'u1', name: 'Manan'    },
    { id: 'u2', name: 'Darshana' },
    { id: 'u3', name: 'Yash'     },
    { id: 'u4', name: 'Mohini'   },
    { id: 'u5', name: 'Raquib'   },
    { id: 'u6', name: 'Kayo'     },
    { id: 'u7', name: 'Neha'     },
    { id: 'u8', name: 'Wise'     }
  ];

  /* [id, projId, ticket, lineItem, task, spocIds, etaKind, eta, etaEnd,
      status, remDate, remNote, notes, createdISO] */
  var rows = [
    /* ---- BCP ---- */
    ['a1','p1','','Compliance module demo',
      'Confirm the next demo with senior stakeholders.',
      ['u1'],'tbd','','','Awaiting Confirmation','2026-08-10',
      'Follow up on the next demo date.',
      'Demo provided on 5 Jul; Manan satisfied. Next demo with senior stakeholders to be confirmed.','2026-07-05'],

    ['a2','p1','','Domiciliation documentation',
      'Bank to review the document and provide signoff.',
      [],'tbd','','','Awaiting Response','2026-08-10',
      'Follow up with bank for review, flow changes, limit changes and signoff.',
      'Document shared with bank on 6 Aug. Bank to share flow & limit changes.\nStandup subject: Domiciliation \u2014 Flow & Limit Changes / Bank Signoff.','2026-08-06'],

    /* ---- ICICI Bank ---- */
    ['a3','p2','ORP-3937','MSwipe for UK to India Remittances',
      'Bank to share BRS.',
      [],'none','','','Awaiting Response','2026-08-10',
      'Follow up with bank for BRS.','','2026-07-28'],

    ['a4','p2','','Live Deployment Tickets List',
      'Complete testing.',
      [],'tbd','','','In Progress','2026-08-10',
      'Follow up for testing status and ETA.',
      'No ETA received yet for ORP Canada live deployment testing.','2026-07-22'],

    ['a5','p2','','DIMFA / ORP AD Authentication',
      'Follow up with bank for an update.',
      [],'none','','','Awaiting Response','2026-08-10',
      'Follow up with bank.',
      'Call happened on 27 Jul. No update received from bank yet.','2026-07-27'],

    ['a6','p2','','Request for Application Technology Stack Details',
      'Follow up on the requested application technology stack details.',
      ['u2'],'none','','','Awaiting Response','2026-08-10',
      'Follow up with bank.','Request was made on 8 Aug.','2026-08-08'],

    ['a7','p2','ORP-3902','Downtime requirement',
      'Bank to confirm downtime requirement of 3\u20135 days.',
      ['u2'],'tbd','','','Awaiting Confirmation','2026-08-10',
      'Follow up with bank for downtime confirmation.','','2026-07-30'],

    ['a8','p2','ORP-3846','Development changes',
      'Obtain confirmation from the bank regarding the development changes.',
      ['u2'],'none','','','Awaiting Confirmation','2026-08-10',
      'Follow up with bank.',
      'Changes completed from dev end; bank still confirming no changes have been done.','2026-07-24'],

    ['a9','p2','ORP-3905','Bank queries',
      'Respond to the bank queries.',
      ['u3'],'none','','','Pending','2026-08-10',
      'Follow up on response.','','2026-08-01'],

    ['a10','p2','ORP-3898','Revised approach document',
      'Prepare/share the revised approach document requested by the bank.',
      ['u3'],'date','2026-08-08','','Pending','2026-08-10',
      'Follow up on revised approach document.','Requested by the bank on 8 Aug.','2026-08-08'],

    ['a11','p2','ORP-3929','Bank signoff',
      'Recheck queries and obtain signoff from the bank.',
      ['u3'],'none','','','Awaiting Signoff','2026-08-10',
      'Follow up for bank signoff.','','2026-07-29'],

    ['a12','p2','ORP-3810','ORP-3810 activity',
      'Complete required activity.',
      ['u3'],'date','2026-08-14','','In Progress','2026-08-13',
      'Follow up before 14 August.','','2026-07-26'],

    ['a13','p2','ORP-3938','ORP-3938 activity',
      'Complete required activity.',
      ['u3'],'date','2026-08-13','','In Progress','2026-08-12',
      'Follow up before 13 August.','','2026-08-03'],

    ['a14','p2','ORP-3913','Observation',
      'Check the observation.',
      ['u4','u5'],'none','','','Pending','2026-08-10',
      'Follow up for completion.','','2026-08-02'],

    ['a15','p2','ORP-3840','Default OTP',
      'Share the default OTP.',
      ['u4','u5'],'none','','','Pending','2026-08-10',
      'Follow up for OTP.','','2026-07-31'],

    ['a16','p2','ORP-3833','eOTP service issue',
      'Ask QA to test the eOTP service issue.',
      ['u5'],'none','','','Pending Testing','2026-08-10',
      'Follow up with QA for testing.','','2026-07-25'],

    ['a17','p2','ORP-3913','Testing',
      'Complete testing.',
      ['u5'],'none','','','In Progress','2026-08-10',
      'Follow up for testing completion.','','2026-08-02'],

    /* ---- SCB Bank ---- */
    ['a18','p3','Capital CR','Capital CR',
      'Follow up on pending CR.',
      ['u6'],'none','','','Pending','2026-08-10',
      'Follow up with Kayo.','','2026-07-21'],

    ['a19','p3','Online Remittance CR','Online Remittance CR',
      'Complete the required changes.',
      ['u7'],'none','','','In Progress','2026-08-10',
      'Follow up on changes.','','2026-07-23'],

    ['a20','p3','','Georgia Changes',
      'Complete the required changes.',
      ['u7'],'none','','','In Progress','2026-08-10',
      'Follow up on changes.','','2026-07-27'],

    ['a21','p3','','Requested Details',
      'Review/check the requested details.',
      ['u8'],'none','','','In Progress','2026-08-10',
      'Follow up on details.','','2026-08-04'],

    ['a22','p3','','Bank.in activity',
      'Track the Bank.in activity.',
      [],'date','2026-08-08','','Scheduled','2026-08-10',
      'Follow up on the activity outcome.','','2026-08-05'],

    ['a23','p3','','SCB Deck Meeting',
      'Bank to confirm meeting dates and data requirements.',
      [],'tbd','','','Awaiting Confirmation','2026-08-10',
      'Follow up with bank for date and data confirmation.','','2026-08-05']
  ];

  var nameOf = {};
  people.forEach(function (u) { nameOf[u.id] = u.name; });

  var actionables = rows.map(function (r) {
    var created = ts(r[13]);
    var activity = [{ ts: created, user: SEEDER, event: 'Created', from: '', to: '' }];
    if (r[5].length) {
      activity.push({ ts: created + 60000, user: SEEDER, event: 'SPOC assigned',
        from: '', to: r[5].map(function (id) { return nameOf[id]; }).join(' & ') });
    }
    return {
      id: r[0], projectId: r[1],
      ticket: r[2], ticketUrl: '',
      lineItem: r[3], task: r[4],
      spocIds: r[5].slice(),
      etaKind: r[6], eta: r[7], etaEnd: r[8],
      status: r[9],
      rem: { on: true, date: r[10], time: '', note: r[11], done: false },
      notes: r[12],
      comments: [], activity: activity,
      createdAt: created, updatedAt: created, completedAt: null
    };
  });

  return {
    version: 3,
    projects: projects,
    people: people,
    actionables: actionables,
    settings: {
      userName: 'Yash',
      notifEnabled: true,
      notifHour: 9,
      notifMinute: 0,
      notifSeenDate: '',
      theme: 'dark',
      accent: 'orange',
      font: 'default'
    }
  };
};
