import { useState } from 'react';
import { TaskStatus } from '@egna-enelaklo/shared';
import { useTranslation } from 'react-i18next';
import { Download, Plus, Search } from 'lucide-react';
import { Brand, LogoMark, Wordmark } from '@/components/brand';
import {
  Button,
  Card,
  CardBody,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  Checkbox,
  Chip,
  EmptyState,
  FormField,
  Input,
  Modal,
  Radio,
  RadioGroup,
  Select,
  Skeleton,
  StatusChip,
  Stepper,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  useToast,
} from '@/components/ui';
import { cn } from '@/lib/cn';

function Section({ children, titleKey }: { children: React.ReactNode; titleKey: string }) {
  const { t } = useTranslation();

  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-heading text-sectionTitle font-bold text-ink-900">{t(titleKey)}</h2>
      <Card className="p-5">{children}</Card>
    </section>
  );
}

export function UiKitPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [switchOn, setSwitchOn] = useState(true);
  const [radioValue, setRadioValue] = useState('a');
  const [checked, setChecked] = useState(true);
  const [tab, setTab] = useState('all');

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 py-8">
      <header className="flex flex-col gap-2">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-500">
          egna-enelaklo
        </p>
        <h1 className="font-heading text-pageTitle font-bold text-ink-900">{t('uiKit.title')}</h1>
        <p className="max-w-2xl text-[15px] text-ink-500">{t('uiKit.description')}</p>
      </header>

      <Section titleKey="uiKit.sections.logo">
        <div className="flex flex-wrap items-end gap-8">
          <div className="flex flex-col items-center gap-3">
            <LogoMark size={48} />
            <span className="text-xs text-ink-500">48</span>
          </div>
          <div className="flex flex-col items-center gap-3">
            <LogoMark size={64} />
            <span className="text-xs text-ink-500">64</span>
          </div>
          <div className="flex flex-col items-center gap-3 rounded-panel bg-brand-500 p-4">
            <LogoMark size={48} />
            <span className="text-xs text-brand-100">on teal</span>
          </div>
          <div className="flex flex-col items-center gap-3 rounded-panel bg-ink-900 p-4">
            <LogoMark size={48} />
            <span className="text-xs text-ink-500">on charcoal</span>
          </div>
          <div className="flex flex-col items-center gap-3">
            <Wordmark />
          </div>
          <div className="flex flex-col items-center gap-3 rounded-panel bg-ink-900 p-4">
            <Wordmark className="[&>span:first-child]:text-white" />
          </div>
          <div className="flex flex-col items-center gap-3">
            <Brand markSize={48} />
          </div>
        </div>
      </Section>

      <Section titleKey="uiKit.sections.button">
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-3">
            <Button>{t('uiKit.variants.primary')}</Button>
            <Button variant="secondary">{t('uiKit.variants.secondary')}</Button>
            <Button variant="danger">{t('uiKit.variants.danger')}</Button>
            <Button variant="ghost">{t('uiKit.variants.ghost')}</Button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm">{t('uiKit.sizes.sm')}</Button>
            <Button size="md">{t('uiKit.sizes.md')}</Button>
            <Button size="lg">{t('uiKit.sizes.lg')}</Button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button loading>{t('uiKit.states.loading')}</Button>
            <Button disabled>{t('uiKit.states.disabled')}</Button>
            <Button variant="secondary" disabled>
              {t('uiKit.states.disabled')}
            </Button>
            <Button leftIcon={<Plus aria-hidden="true" className="h-4 w-4" />}>
              {t('common.actions.newTask')}
            </Button>
            <Button
              variant="secondary"
              leftIcon={<Search aria-hidden="true" className="h-4 w-4" />}
            >
              {t('common.actions.search')}
            </Button>
            <Button
              variant="secondary"
              rightIcon={<Download aria-hidden="true" className="h-4 w-4" />}
            >
              {t('common.actions.exportCsv')}
            </Button>
          </div>
        </div>
      </Section>

      <Section titleKey="uiKit.sections.input">
        <div className="grid gap-6 md:grid-cols-2">
          <FormField htmlFor="ui-input-default" label={t('uiKit.states.default')}>
            <Input id="ui-input-default" placeholder="tigist@example.com" />
          </FormField>

          <FormField
            htmlFor="ui-input-hint"
            label={t('uiKit.states.withHint')}
            hint="+251 911 000 000"
          >
            <Input id="ui-input-hint" />
          </FormField>

          <FormField
            htmlFor="ui-input-invalid"
            label={t('uiKit.states.invalid')}
            error={t('auth.errors.required')}
          >
            <Input id="ui-input-invalid" defaultValue="abc" />
          </FormField>

          <FormField htmlFor="ui-input-disabled" label={t('uiKit.states.disabled')}>
            <Input id="ui-input-disabled" disabled defaultValue="Disabled" />
          </FormField>
        </div>
      </Section>

      <Section titleKey="uiKit.sections.select">
        <div className="grid gap-6 md:grid-cols-2">
          <FormField htmlFor="ui-select-default" label={t('uiKit.states.default')}>
            <Select
              id="ui-select-default"
              options={[
                { label: 'Buy and deliver', value: 'BUY_AND_DELIVER' },
                { label: 'Queue and paperwork', value: 'QUEUE_AND_PAPERWORK' },
                { label: 'Pickup and drop-off', value: 'PICKUP_AND_DROPOFF' },
              ]}
              placeholder="Select a service"
            />
          </FormField>

          <FormField
            htmlFor="ui-select-invalid"
            label={t('uiKit.states.invalid')}
            error={t('auth.errors.required')}
          >
            <Select
              id="ui-select-invalid"
              defaultValue="QUEUE_AND_PAPERWORK"
              options={[
                { label: 'Buy and deliver', value: 'BUY_AND_DELIVER' },
                { label: 'Queue and paperwork', value: 'QUEUE_AND_PAPERWORK' },
              ]}
            />
          </FormField>
        </div>
      </Section>

      <Section titleKey="uiKit.sections.textarea">
        <div className="grid gap-6 md:grid-cols-2">
          <FormField htmlFor="ui-textarea-default" label={t('uiKit.states.default')}>
            <Textarea id="ui-textarea-default" placeholder="Add the items and the maximum budget" />
          </FormField>

          <FormField
            htmlFor="ui-textarea-invalid"
            label={t('uiKit.states.invalid')}
            error={t('auth.errors.required')}
          >
            <Textarea id="ui-textarea-invalid" defaultValue="Too short" />
          </FormField>
        </div>
      </Section>

      <Section titleKey="uiKit.sections.checkbox">
        <div className="flex flex-col gap-4">
          <Checkbox
            label={t('uiKit.states.default')}
            checked={checked}
            onCheckedChange={setChecked}
          />
          <Checkbox label={t('uiKit.states.disabled')} disabled />
        </div>
      </Section>

      <Section titleKey="uiKit.sections.radio">
        <RadioGroup value={radioValue} onValueChange={setRadioValue}>
          <Radio value="a" label="Standard delivery" description="Same day, before 6 pm" />
          <Radio value="b" label="Express delivery" description="Next available slot" />
          <Radio value="c" label="Disabled option" disabled />
        </RadioGroup>
      </Section>

      <Section titleKey="uiKit.sections.switch">
        <div className="flex max-w-md flex-col gap-4">
          <Switch
            label={t('uiKit.states.default')}
            description="Notifications are sent to your email and phone"
            checked={switchOn}
            onCheckedChange={setSwitchOn}
          />
          <Switch label={t('uiKit.states.disabled')} disabled />
        </div>
      </Section>

      <Section titleKey="uiKit.sections.card">
        <Card>
          <CardHeader>
            <CardTitle>Card with header</CardTitle>
            <p className="text-sm text-ink-500">
              Cards are white, 1px line border, 16px radius, no shadow.
            </p>
          </CardHeader>
          <CardContent>Card content sits between the header and the footer.</CardContent>
          <CardFooter>
            <Button size="sm">{t('common.actions.save')}</Button>
            <Button size="sm" variant="secondary">
              {t('common.actions.cancel')}
            </Button>
          </CardFooter>
        </Card>
      </Section>

      <Section titleKey="uiKit.sections.table">
        <Card>
          <CardHeader>
            <CardTitle>{t('pages.customer.dashboard')}</CardTitle>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>TASK</TableHead>
                <TableHead>SERVICE</TableHead>
                <TableHead>STATUS</TableHead>
                <TableHead>UPDATED</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-semibold text-ink-900">
                  Water dispenser from Bole Mall
                </TableCell>
                <TableCell>{t('services.BUY_AND_DELIVER')}</TableCell>
                <TableCell>
                  <StatusChip status={TaskStatus.QUOTED} />
                </TableCell>
                <TableCell>10 min ago</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-semibold text-ink-900">
                  Collect trade licence renewal
                </TableCell>
                <TableCell>{t('services.QUEUE_AND_PAPERWORK')}</TableCell>
                <TableCell>
                  <StatusChip status={TaskStatus.IN_PROGRESS} />
                </TableCell>
                <TableCell>1 hour ago</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-semibold text-ink-900">
                  Deliver envelope to Piassa
                </TableCell>
                <TableCell>{t('services.PICKUP_AND_DROPOFF')}</TableCell>
                <TableCell>
                  <StatusChip status={TaskStatus.DELIVERED} />
                </TableCell>
                <TableCell>Yesterday</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Card>
      </Section>

      <Section titleKey="uiKit.sections.tabs">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="all">All 12</TabsTrigger>
            <TabsTrigger value="active">Active 3</TabsTrigger>
            <TabsTrigger value="completed">Completed 7</TabsTrigger>
          </TabsList>
          <TabsContent value="all">
            <CardBody className="rounded-panel border border-line bg-canvas text-[15px] text-ink-500">
              All tasks
            </CardBody>
          </TabsContent>
          <TabsContent value="active">
            <CardBody className="rounded-panel border border-line bg-canvas text-[15px] text-ink-500">
              Active tasks
            </CardBody>
          </TabsContent>
          <TabsContent value="completed">
            <CardBody className="rounded-panel border border-line bg-canvas text-[15px] text-ink-500">
              Completed tasks
            </CardBody>
          </TabsContent>
        </Tabs>
      </Section>

      <Section titleKey="uiKit.sections.stepper">
        <Stepper
          currentIndex={1}
          steps={[
            { id: 'request', label: 'Request', description: 'Customer submits the task' },
            { id: 'quote', label: 'Quote', description: 'Staff price the errand' },
            { id: 'confirm', label: 'Confirm', description: 'Customer approves' },
            { id: 'deliver', label: 'Deliver', description: 'Tasker runs the job' },
          ]}
        />
      </Section>

      <Section titleKey="uiKit.sections.modal">
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => setModalOpen(true)}>
            {t('uiKit.sections.modal')}
          </Button>
        </div>

        <Modal
          open={modalOpen}
          onOpenChange={setModalOpen}
          title="Approve this quote?"
          description="The final charge is the service fee plus the receipt total, never above the authorised amount."
          footer={
            <>
              <Button variant="secondary" onClick={() => setModalOpen(false)}>
                {t('common.actions.cancel')}
              </Button>
              <Button onClick={() => setModalOpen(false)}>{t('common.actions.approve')}</Button>
            </>
          }
        >
          <p className="text-[15px] text-ink-700">
            Approving the quote releases the task for assignment to a verified tasker.
          </p>
        </Modal>
      </Section>

      <Section titleKey="uiKit.sections.toast">
        <div className="flex flex-wrap gap-3">
          <Button
            variant="secondary"
            onClick={() =>
              toast({
                title: 'Saved',
                description: 'The task draft was saved.',
                variant: 'success',
              })
            }
          >
            success
          </Button>
          <Button
            variant="secondary"
            onClick={() =>
              toast({
                title: 'Heads up',
                description: 'The quote is waiting on the customer.',
                variant: 'warning',
              })
            }
          >
            warning
          </Button>
          <Button
            variant="secondary"
            onClick={() =>
              toast({
                title: 'Something went wrong',
                description: 'Try again in a moment.',
                variant: 'error',
              })
            }
          >
            error
          </Button>
          <Button
            variant="secondary"
            onClick={() =>
              toast({
                title: 'New task started',
                description: 'Choose a service to continue.',
                variant: 'info',
              })
            }
          >
            info
          </Button>
        </div>
      </Section>

      <Section titleKey="uiKit.sections.emptyState">
        <EmptyState
          title={t('common.states.empty')}
          description="Tasks you create will appear here with their status and the amount charged."
          action={
            <Button>
              <Plus aria-hidden="true" className="h-4 w-4" />
              {t('common.actions.newTask')}
            </Button>
          }
        />
      </Section>

      <Section titleKey="uiKit.sections.skeleton">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-5 w-3/4" />
        </div>
      </Section>

      <Section titleKey="uiKit.sections.chip">
        <div className="flex flex-wrap gap-3">
          <Chip>neutral</Chip>
          <Chip variant="brand">brand</Chip>
          <Chip variant="warning">warning</Chip>
          <Chip variant="danger">danger</Chip>
          <Chip variant="outline">outline</Chip>
        </div>
      </Section>

      <Section titleKey="uiKit.sections.statusChip">
        <div className="flex flex-wrap gap-3">
          {Object.values(TaskStatus).map((status) => (
            <StatusChip key={status} status={status} />
          ))}
        </div>

        <div className="mt-6 grid gap-3 border-t border-line pt-4 text-xs text-ink-500 sm:grid-cols-2">
          <p className="flex items-center gap-2">
            <span className={cn('h-4 w-4 rounded-full', 'bg-chip-bg')} /> Draft / Cancelled — grey
          </p>
          <p className="flex items-center gap-2">
            <span className={cn('h-4 w-4 rounded-full', 'bg-brand-50')} /> Submitted / In review —
            teal tint
          </p>
          <p className="flex items-center gap-2">
            <span className={cn('h-4 w-4 rounded-full', 'bg-warning-bg')} /> Needs info / Quote
            ready — amber
          </p>
          <p className="flex items-center gap-2">
            <span className={cn('h-4 w-4 rounded-full', 'bg-brand-500')} /> Approved / In progress —
            solid teal
          </p>
          <p className="flex items-center gap-2">
            <span className={cn('h-4 w-4 rounded-full border border-brand-500')} /> Delivered —
            outlined teal
          </p>
          <p className="flex items-center gap-2">
            <span className={cn('h-4 w-4 rounded-full', 'bg-ink-900')} /> Completed — charcoal
          </p>
          <p className="flex items-center gap-2">
            <span className={cn('h-4 w-4 rounded-full', 'bg-danger-bg')} /> Exception — red
          </p>
        </div>
      </Section>
    </div>
  );
}
