import { Global, Module } from '@nestjs/common';
import { FirestoreService } from './firestore.service';

/**
 * Initializes Firebase Admin and exposes a singleton Firestore instance.
 * Marked @Global so feature modules don't each have to import it.
 */
@Global()
@Module({
  providers: [FirestoreService],
  exports: [FirestoreService],
})
export class FirestoreModule {}
