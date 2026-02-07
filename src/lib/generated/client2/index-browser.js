
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  imieNazwisko: 'imieNazwisko',
  haslo: 'haslo',
  rola: 'rola'
};

exports.Prisma.TeamScalarFieldEnum = {
  id: 'id',
  nazwa: 'nazwa',
  kolor: 'kolor',
  opis: 'opis',
  allowApplications: 'allowApplications'
};

exports.Prisma.UserTeamScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  teamId: 'teamId',
  rola: 'rola'
};

exports.Prisma.AnnouncementScalarFieldEnum = {
  id: 'id',
  teamId: 'teamId',
  typPrzypisania: 'typPrzypisania',
  tytul: 'tytul',
  tresc: 'tresc',
  utworzonePrzez: 'utworzonePrzez',
  dataUtworzenia: 'dataUtworzenia',
  expiresAt: 'expiresAt'
};

exports.Prisma.AnnouncementAssignmentScalarFieldEnum = {
  id: 'id',
  announcementId: 'announcementId',
  userId: 'userId'
};

exports.Prisma.MeetingScalarFieldEnum = {
  id: 'id',
  teamId: 'teamId',
  data: 'data',
  godzina: 'godzina',
  opis: 'opis',
  opisDodatkowy: 'opisDodatkowy',
  signupDeadline: 'signupDeadline'
};

exports.Prisma.ReportScalarFieldEnum = {
  id: 'id',
  meetingId: 'meetingId',
  tytul: 'tytul',
  tresc: 'tresc',
  utworzonePrzez: 'utworzonePrzez',
  dataUtworzenia: 'dataUtworzenia'
};

exports.Prisma.AttendanceScalarFieldEnum = {
  id: 'id',
  meetingId: 'meetingId',
  imieNazwisko: 'imieNazwisko',
  userId: 'userId',
  confirmed: 'confirmed'
};

exports.Prisma.EventScalarFieldEnum = {
  id: 'id',
  nazwa: 'nazwa',
  data: 'data',
  limitOsob: 'limitOsob',
  signupDeadline: 'signupDeadline'
};

exports.Prisma.EventRegistrationScalarFieldEnum = {
  id: 'id',
  eventId: 'eventId',
  imieNazwisko: 'imieNazwisko',
  userId: 'userId'
};

exports.Prisma.TaskScalarFieldEnum = {
  id: 'id',
  teamId: 'teamId',
  typPrzypisania: 'typPrzypisania',
  tytul: 'tytul',
  opis: 'opis',
  termin: 'termin',
  priorytet: 'priorytet',
  utworzonePrzezId: 'utworzonePrzezId',
  utworzonePrzez: 'utworzonePrzez',
  dataUtworzenia: 'dataUtworzenia',
  status: 'status',
  uwagiOdrzucenia: 'uwagiOdrzucenia',
  poprawione: 'poprawione'
};

exports.Prisma.TaskAttachmentScalarFieldEnum = {
  id: 'id',
  taskId: 'taskId',
  nazwa: 'nazwa',
  url: 'url'
};

exports.Prisma.TaskSubmissionScalarFieldEnum = {
  id: 'id',
  taskId: 'taskId',
  userId: 'userId',
  imieNazwisko: 'imieNazwisko',
  opis: 'opis',
  dataDodania: 'dataDodania'
};

exports.Prisma.TaskAssignmentScalarFieldEnum = {
  id: 'id',
  taskId: 'taskId',
  userId: 'userId',
  teamId: 'teamId',
  dataPrzypisania: 'dataPrzypisania'
};

exports.Prisma.TaskExecutionScalarFieldEnum = {
  id: 'id',
  taskId: 'taskId',
  userId: 'userId',
  imieNazwisko: 'imieNazwisko',
  wykonane: 'wykonane',
  status: 'status',
  uwagiOdrzucenia: 'uwagiOdrzucenia',
  poprawione: 'poprawione',
  terminPoprawki: 'terminPoprawki',
  dataOznaczenia: 'dataOznaczenia',
  isArchived: 'isArchived',
  archiveFolderId: 'archiveFolderId'
};

exports.Prisma.SystemSettingsScalarFieldEnum = {
  id: 'id',
  alertsTerminy: 'alertsTerminy',
  alertsPoprawki: 'alertsPoprawki',
  alertsRaporty: 'alertsRaporty',
  coordinatorTasks: 'coordinatorTasks',
  coordinatorTeamEditing: 'coordinatorTeamEditing',
  coordinatorResignationAlerts: 'coordinatorResignationAlerts'
};

exports.Prisma.NotificationScalarFieldEnum = {
  id: 'id',
  type: 'type',
  status: 'status',
  teamId: 'teamId',
  userId: 'userId',
  data: 'data',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ArchiveFolderScalarFieldEnum = {
  id: 'id',
  nazwa: 'nazwa',
  dataUtworzenia: 'dataUtworzenia'
};

exports.Prisma.UserArchiveFolderScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  folderId: 'folderId',
  status: 'status'
};

exports.Prisma.ChatMessageScalarFieldEnum = {
  id: 'id',
  senderId: 'senderId',
  receiverId: 'receiverId',
  content: 'content',
  isRead: 'isRead',
  createdAt: 'createdAt'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.NullableJsonNullValueInput = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};

exports.Prisma.JsonNullValueFilter = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
  AnyNull: Prisma.AnyNull
};


exports.Prisma.ModelName = {
  User: 'User',
  Team: 'Team',
  UserTeam: 'UserTeam',
  Announcement: 'Announcement',
  AnnouncementAssignment: 'AnnouncementAssignment',
  Meeting: 'Meeting',
  Report: 'Report',
  Attendance: 'Attendance',
  Event: 'Event',
  EventRegistration: 'EventRegistration',
  Task: 'Task',
  TaskAttachment: 'TaskAttachment',
  TaskSubmission: 'TaskSubmission',
  TaskAssignment: 'TaskAssignment',
  TaskExecution: 'TaskExecution',
  SystemSettings: 'SystemSettings',
  Notification: 'Notification',
  ArchiveFolder: 'ArchiveFolder',
  UserArchiveFolder: 'UserArchiveFolder',
  ChatMessage: 'ChatMessage'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
