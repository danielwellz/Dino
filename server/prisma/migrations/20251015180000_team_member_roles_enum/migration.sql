DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TeamMemberRole') THEN
        CREATE TYPE "TeamMemberRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER');
    END IF;
END;
$$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'TeamMember'
          AND column_name = 'role'
    ) THEN
        UPDATE "TeamMember"
        SET "role" = 'MEMBER'
        WHERE "role" IS NULL OR "role" NOT IN ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER');

        ALTER TABLE "TeamMember"
            ALTER COLUMN "role" DROP DEFAULT;

        IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'TeamMember'
              AND column_name = 'role'
              AND udt_name <> 'teammemberrole'
        ) THEN
            ALTER TABLE "TeamMember"
                ALTER COLUMN "role" TYPE "TeamMemberRole"
                USING (
                    CASE
                        WHEN "role" IN ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER') THEN "role"::"TeamMemberRole"
                        ELSE 'MEMBER'::"TeamMemberRole"
                    END
                );
        END IF;

        ALTER TABLE "TeamMember"
            ALTER COLUMN "role" SET DEFAULT 'MEMBER',
            ALTER COLUMN "role" SET NOT NULL;
    END IF;
END;
$$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'AssetFolderRolePolicy'
    ) THEN
        UPDATE "AssetFolderRolePolicy"
        SET "role" = 'MEMBER'
        WHERE "role" IS NULL OR "role" NOT IN ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER');

        IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'AssetFolderRolePolicy'
              AND column_name = 'role'
              AND udt_name <> 'teammemberrole'
        ) THEN
            ALTER TABLE "AssetFolderRolePolicy"
                ALTER COLUMN "role" TYPE "TeamMemberRole"
                USING (
                    CASE
                        WHEN "role" IN ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER') THEN "role"::"TeamMemberRole"
                        ELSE 'MEMBER'::"TeamMemberRole"
                    END
                );
        END IF;
    END IF;
END;
$$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'ProjectStage'
          AND column_name = 'ownerRole'
          AND udt_name <> 'teammemberrole'
    ) THEN
        ALTER TABLE "ProjectStage"
            ALTER COLUMN "ownerRole" TYPE "TeamMemberRole" USING (
                CASE
                    WHEN "ownerRole" IN ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER') THEN "ownerRole"::"TeamMemberRole"
                    ELSE NULL
                END
            );
    END IF;
END;
$$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'ProjectParticipant'
          AND column_name = 'role'
    ) THEN
        UPDATE "ProjectParticipant"
        SET "role" = 'MEMBER'
        WHERE "role" IS NULL OR "role" NOT IN ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER');

        IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'ProjectParticipant'
              AND column_name = 'role'
              AND udt_name <> 'teammemberrole'
        ) THEN
            ALTER TABLE "ProjectParticipant"
                ALTER COLUMN "role" TYPE "TeamMemberRole"
                USING (
                    CASE
                        WHEN "role" IN ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER') THEN "role"::"TeamMemberRole"
                        ELSE 'MEMBER'::"TeamMemberRole"
                    END
                );
        END IF;

        ALTER TABLE "ProjectParticipant"
            ALTER COLUMN "role" SET NOT NULL;
    END IF;
END;
$$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'ProjectInvitation'
          AND column_name = 'role'
    ) THEN
        UPDATE "ProjectInvitation"
        SET "role" = 'MEMBER'
        WHERE "role" IS NULL OR "role" NOT IN ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER');

        IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'ProjectInvitation'
              AND column_name = 'role'
              AND udt_name <> 'teammemberrole'
        ) THEN
            ALTER TABLE "ProjectInvitation"
                ALTER COLUMN "role" TYPE "TeamMemberRole"
                USING (
                    CASE
                        WHEN "role" IN ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER') THEN "role"::"TeamMemberRole"
                        ELSE 'MEMBER'::"TeamMemberRole"
                    END
                );
        END IF;

        ALTER TABLE "ProjectInvitation"
            ALTER COLUMN "role" SET NOT NULL;
    END IF;
END;
$$;
