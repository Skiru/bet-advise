# Bet Advise — NestJS AWS/MiniStack Hardened Backend (TypeORM)

Produkcyjnej klasy backend (Hardened Baseline) oparty o architekturę **Modular Monolith** przy użyciu **NestJS 11**, **PostgreSQL (TypeORM)**, **ElastiCache Redis**, **Amazon SQS** oraz **Amazon S3**. Lokalne środowisko emulowane jest przy użyciu **MiniStack**.

Ustrukturyzowany pod kątem defensywnego programowania, wysokiej odporności na błędy (Zero-Trust) oraz pełnej zgodności z najlepszymi praktykami AWS i NestJS.

---

## 1. Technologiczny Stack
- **Framework:** NestJS 11 (strict TypeScript configuration)
- **Baza Danych:** Aurora PostgreSQL 16 (lokalnie MiniStack RDS-compatible na porcie 15432)
- **ORM:** TypeORM v0.3 (Data Mapper Pattern)
- **Cache:** Amazon ElastiCache Redis (lokalnie MiniStack ElastiCache-compatible na porcie 16379)
- **Kolejki (Message Queue):** Amazon SQS z DLQ (lokalnie MiniStack SQS na porcie 4566)
- **Storage:** Amazon S3 z Block Public Access (lokalnie MiniStack S3 na porcie 4566)
- **Uruchomienie Lokalne:** Docker Compose, Corepack, pnpm@11.9.0, fnm (Node 24)

---

## 2. Architektura Systemu (Overview)

Projekt wdraża **Modular Monolith** ze wzorcem **CQRS (Command Query Responsibility Segregation)** oraz **Transactional Outbox Pattern**:

1. **Clean Domain Model:** Wszystkie encje domenowe (`Match`, `Advice`) w folderach `domain/` są w 100% czystymi klasami TypeScript pozbawionymi jakichkolwiek dekoratorów ORM.
2. **TypeORM Data Mappers:** Repozytoria (`TypeOrmMatchRepository`, `TypeOrmAdviceRepository`) pełnią rolę Data Mapperów — odpowiadają za mapowanie fizycznych encji bazodanowych (dekorowanych dekoratorami TypeORM) na czyste obiekty domenowe.
3. **Transactional Outbox:** Wygenerowanie rekomendacji (Advice) zapisuje rekord `AdviceEntity` oraz zdarzenie outbox `OutboxEventEntity` w obrębie **jednej transakcji bazodanowej** (`QueryRunner` transaction).
4. **Outbox Relay (`OutboxRelayService`):** Lekki, cykliczny deweloperski demon, który pobiera zdarzenia o statusie `PENDING`, bezpiecznie publikuje je na Amazon SQS i w przypadku sukcesu markuje je jako `PUBLISHED`. W razie niepowodzenia inkrementuje licznik prób i przechodzi w stan `FAILED` po osiągnięciu limitu.
5. **Idempotentny SQS Consumer (`SqsConsumerService`):** Pobiera zdarzenia z kolejki SQS za pomocą długiego odpytywania (Long Polling) i dba o duplikaty przy użyciu tabeli `ProcessedMessageEntity` (unikalny klucz złożony `eventId` + `handlerName`), gwarantując semantykę *exactly-once processing*.
6. **Zasada Zero-Trust dla AWS:** Brak zahardkodowanych haseł i kluczy AWS. W produkcji aplikacja automatycznie rozwiązuje tożsamość poprzez domyślny łańcuch dostawców (IAM Roles / Default Credential Provider Chain).

---

## 3. MiniStack — Lokalne Środowisko AWS

**MiniStack** jest super-szybkim, zoptymalizowanym emulatorem chmurowym AWS napisanym pod lokalny development (zastępuje ciężkie emulatory i oddzielne kontenery). 

### Zalety i powody użycia:
- Jeden port (`4566`) na wszystkie emulowane serwisy AWS (S3, SQS).
- Izolowane i trwałe bazy PostgreSQL (port `15432`) oraz Redis (port `16379`) powiązane z siecią Docker MiniStack.
- Pełna zgodność z API AWS SDK v3.

---

## 4. Wymagania Wstępne (Prerequisites)
Przed uruchomieniem upewnij się, że masz zainstalowane:
- **Docker** oraz **Docker Desktop**
- **fnm** (Fast Node Manager)
- **Corepack** (do aktywacji pnpm)

---

## 5. Jak Uruchomić Lokalnie (Quick Start)

Wykonaj poniższe kroki w terminalu (zalecany `fish` shell):

```bash
# 1. Aktywuj wersję Node i pnpm
fnm use
corepack enable
corepack enable pnpm

# 2. Zainstaluj zależności z zamrożonym lockfile
pnpm install --frozen-lockfile

# 3. Uruchom kontener MiniStack
pnpm local:up

# 4. Inicjalizuj zasoby MiniStack (bucket S3, kolejki SQS, generowanie .env.local.generated)
pnpm local:bootstrap

# 5. Uruchom testy diagnostyczne (Doctor), aby potwierdzić, że usługi działają poprawnie
pnpm local:doctor

# 6. Uruchom aplikację w trybie deweloperskim (TypeORM automatycznie zsynchronizuje strukturę tabel lokalnie!)
pnpm dev
```

Po uruchomieniu aplikacja będzie dostępna pod adresem:
- API endpoints: `http://localhost:3000/api`
- Swagger OpenAPI: `http://localhost:3000/docs`
- Healthchecks:
  - Live: `http://localhost:3000/api/health/live`
  - Ready (pełna gotowość bazy, Redis, S3, SQS): `http://localhost:3000/api/health/ready`

---

## 6. AWS Production Ready Notes

Przy wdrażaniu na chmurę produkcyjną AWS (np. ECS/EKS/App Runner):
- **Baza danych:** Użyj AWS Aurora PostgreSQL 16. Wymuszone jest szyfrowanie połączeń TLS (`DATABASE_SSL=true` automatycznie dołącza parametr `sslmode=require`).
- **Autoryzacja AWS:** static credentials (`AWS_ACCESS_KEY_ID` i `AWS_SECRET_ACCESS_KEY`) zostają puste. Aplikacja użyje automatycznie **AWS IAM Task Roles** z przypisanymi politykami dającymi uprawnienia do SQS/S3.
- **S3 Bucket Security:** Wiadra S3 posiadają wyłączony publiczny dostęp (S3 Block Public Access). Odczyt plików odbywa się tylko przez serwer za pomocą uwierzytelnionych metod API.
- **Wdrożenia bazy:** Lokalne schema synchronizacje są ograniczone wyłącznie do środowisk lokalnych (`synchronize: isLocal`). W produkcji automatyczna synchronizacja baz danych jest wyłączona (`synchronize: false`), a struktura tabel jest aplikowana przez migracje lub potoki CI/CD.
- **ElastiCache Redis:** TLS jest konfigurowalny w chmurze (`REDIS_TLS=true`).

---

## 7. MiniStack Fidelity Gaps (Różnice lokalne)
- **IAM:** MiniStack nie weryfikuje poprawności uprawnień IAM — akceptuje dowolne dummy credentials (`test`/`test`) lokalnie. W produkcji uprawnienia ról IAM muszą być zdefiniowane za pomocą Terraform/CDK.
- **Block Public Access:** Niektóre implementacje MiniStack S3 mogą nie egzekwować restrykcyjnych reguł Block Public Access w 100%, aczkolwiek deweloperski adapter konfiguruje te reguły w trybie defensive.
- **Kolejkowanie SQS:** Czas reakcji emulowanego SQS w MiniStack może nieznacznie różnić się pod kątem precyzji opóźnień (visibility timeout) od realnego systemu AWS.

---

## 8. Dostępne Skrypty i Polecenia

- `pnpm local:up` — Uruchamia MiniStack w tle.
- `pnpm local:bootstrap` — Tworzy bucket S3, kolejki SQS z Redrive Policy, sprawdza porty DB/Redis i tworzy plik `.env.local.generated`.
- `pnpm local:doctor` — Odpala test integracyjny (S3 put/get/delete, SQS send/receive/delete, DB query, Redis ping) raportując PASS/FAIL.
- `pnpm typecheck` — Statyczna kontrola typów TypeScript.
- `pnpm lint` — Uruchomienie lintera (0 błędów, strict rule compliance).
- `pnpm test` — Uruchomienie testów jednostkowych (wszystkie 11 testów przechodzi pomyślnie).
- `pnpm build` — Kompilacja aplikacji produkcyjnej do folderu `dist/`.

---

## 9. Testowanie

Uruchomienie wszystkich testów i weryfikacji lintera:
```bash
pnpm check
```

Uruchomienie testów E2E:
```bash
pnpm check:e2e
```
