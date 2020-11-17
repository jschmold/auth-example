import { TestingModule, Test } from '@nestjs/testing';
import { AppModule } from '@app/app.module';
import { OrganizationService } from '@app/organization/organization.service';
import { setupDefaultApp } from '@app/app';
import { INestApplication } from '@nestjs/common';
import { OrganizationModel } from '@app/organization/models/organization.model';
import { UserModel } from '@app/user/models/user.model';
import { CreateOrganization } from '@app/organization/types/create-organization';
import { UserProvider } from '@test/database/providers/user.provider';
import { Database } from '@test/database';
import { OrganizationProvider } from '@test/database/providers/organization.provider';
import { OrganizationRole } from '@app/organization/types/roles';
import { OrganizationUserProvider } from '@test/database/providers/organization-user.provider';

describe('OrganizationModule -- OrganizationService', () => {
  let app: INestApplication;
  let service: OrganizationService;

  let db: Database;
  let userProvider: UserProvider;
  let orgProvider: OrganizationProvider;
  let orgUserProvider: OrganizationUserProvider;

  let user: UserModel;

  beforeAll(async () => {
    db = new Database(UserProvider, OrganizationProvider, OrganizationUserProvider);
    await db.connect('OrganizationService E2E Tests')

    userProvider = db.getProvider(UserProvider);
    orgProvider = db.getProvider(OrganizationProvider);
    orgUserProvider = db.getProvider(OrganizationUserProvider)
  });

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test
      .createTestingModule({ imports: [AppModule] })
      .compile();

    app = moduleFixture.createNestApplication();
    setupDefaultApp(app);
    await app.init();

    service = moduleFixture.get(OrganizationService);

    user = await userProvider.createOne({
      email: 'organization_servicetests@e2e-tests.example.com',
    });
  });

  afterEach(async () => {
    await app.close();
    await userProvider.delete({ email: user.email });
  });

  afterAll(async () => {
    await db.disconnect();
  })

  describe('#create', () => {
    let dto: CreateOrganization;

    beforeEach(() => {
      dto = new CreateOrganization();
      dto.name = `${Date.now()}-Org-#createTest`;
    });

    beforeEach(async () => {
      await orgProvider.delete({ name: dto.name });
    });

    afterEach(async () => {
      await orgProvider.delete({ name: dto.name });
    });

    it('should be able to create organization', async () => {
      const creation = await service.create(dto, user.id);
      expect(creation).toBeDefined();
    });

  });

  describe('#getOrganization', () => {
    // snake_case organization
    let organization: OrganizationModel;

    beforeEach(async () => {
      try {
        organization = await orgProvider.createOne({ creatorId: user.id });
      } catch(err) {
        console.error('Unable to setup #getOrganization because: \n', err)
      }
    });

    afterEach(async () => {
      try {
        await orgProvider.delete({ creatorId: user.id });
      } catch (err) {
        console.error('Unable to cleanup after #getOrganization because: ', err)
      }
    });

    it('should get the right organization by id', async () => {
      const result = await service.get({ id: organization.id });
      expect(result).toEqual(organization);
    });
  });

  describe('#addUser', () => {
    let org: OrganizationModel;
    let target: UserModel;

    beforeEach(async () => {
      const email = 'org_service_add_user@e2e-tests.example.com';
      const targetEmail = 'org_service_add_user_target@e2e-tests.example.com';

      const [ owner, other ] = await userProvider.createMany([ { email }, { email: targetEmail } ]);

      org = await orgProvider.createOne({ creatorId: owner.id });
      target = other;
    });

    afterEach(async () => {
      const ids = [ org.creatorId ];
      if (!!target?.id) ids.push(target.id);

      await userProvider.delete(ids);
    });

    for (const role of ['owner', 'user', 'guest'] as OrganizationRole[]) {
      it('adds the target user to the organization with the guest role', async () => {
        const arg = { userId: target.id, orgId: org.id, role };
        const created = await service.addUser(arg);
        expect(created).toBeDefined();
        expect(created.role).toEqual(role);
        expect(created.orgId).toEqual(org.id);
        expect(created.userId).toEqual(target.id);

        const record = await orgUserProvider.repo.findOne({ userId: target.id, orgId: org.id });
        expect(record).toBeTruthy();
        expect(created).toEqual(record);
      });
    }


  });
});

