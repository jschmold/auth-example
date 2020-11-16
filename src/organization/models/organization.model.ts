import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn } from 'typeorm';
import { UserModel } from '@app/user/user.model';

@Entity({ schema: 'accounts', name: 'organizations' })
export class OrganizationModel {
  @PrimaryGeneratedColumn('uuid')
  public id: string;

  @Column({ type: 'varchar', length: 256, nullable: false })
  public name: string;

  @Column({ type: 'uuid', name: 'creator_id' })
  public creatorId: string;

  @OneToOne(() => UserModel)
  @JoinColumn()
  public creator: UserModel;
}
