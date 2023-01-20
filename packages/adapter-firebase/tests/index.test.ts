import { runBasicTests } from "@next-auth/adapter-test"

import { FirestoreAdapter, type FirebaseAdapterConfig } from "../src"
import {
  collestionsFactory,
  firestore,
  getDoc,
  getOneDoc,
  mapFieldsFactory,
} from "../src/utils"

describe.each([
  { namingStrategy: "snake_case" },
  { namingStrategy: "default" },
] as Partial<FirebaseAdapterConfig>[])(
  "FirebaseAdapter with config: %s",
  (config) => {
    config.appName = `next-auth-test-${config.namingStrategy}`
    const db = firestore(
      {
        projectId: "next-auth-test",
        databaseURL: "http://localhost:8080",
      },
      config.appName
    )

    const preferSnakeCase = config.namingStrategy === "snake_case"
    const mapper = mapFieldsFactory(preferSnakeCase)
    const C = collestionsFactory(db, preferSnakeCase)

    for (const [name, collection] of Object.entries(C)) {
      test(`collection "${name}" should be empty`, async () => {
        expect((await collection.count().get()).data().count).toBe(0)
      })
    }

    runBasicTests({
      adapter: FirestoreAdapter(config),
      db: {
        disconnect: async () => await db.terminate(),
        session: (sessionToken) =>
          getOneDoc(
            C.sessions.where(mapper.toDb("sessionToken"), "==", sessionToken)
          ),
        user: (userId) => getDoc(C.users.doc(userId)),
        account: ({ provider, providerAccountId }) =>
          getOneDoc(
            C.accounts
              .where("provider", "==", provider)
              .where(mapper.toDb("providerAccountId"), "==", providerAccountId)
          ),
        verificationToken: ({ identifier, token }) =>
          getOneDoc(
            C.verification_tokens
              .where("identifier", "==", identifier)
              .where("token", "==", token)
          ),
      },
    })
  }
)
