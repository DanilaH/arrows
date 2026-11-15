import { createUiMotion } from './uiMotion';
import { createA1CueQA, createA1ErrorCue, type A1CueMoment } from './a1ErrorCue';
import { campaign, tutorialFor } from '../content/campaign';
import { distanceToPath, type Point } from '../domain/geometry';
import { BoardGestures } from '../input/gestures';
import { copy, type GameLanguage } from '../app/language';
import type { createPlatformRuntime } from '../app/platform';
import { ProgressStore, type SaveChange } from '../progression/save';
import { Board, type Level } from '../domain/board';
import { installMetaSurface } from './meta';
import { installSettingsSurface, settingsIcon } from './settings';
import { installAdSurface } from './adSurface';
import { createAdTransition } from '../platform/adTransition';
import { interstitialReason } from '../progression/adCadence';
import { localDate } from '../progression/calendar';
import { earnedAwards } from '../progression/collection';
import { createHelpOffers } from './helpOffers';
import type {HelpOffer} from '../progression/helpLedger';
import type { BoardScene } from './BoardScene';
import type {GameReviewOptions} from '../pilot/review';

type Platform = ReturnType<typeof createPlatformRuntime>;
export function installGameSurface(scene: BoardScene, platform: Platform, language: GameLanguage, reviewFields: readonly Level[] = [], reviewOptions: GameReviewOptions = {}) {
  let text = copy[language];
  const motion = createUiMotion();
  const root = document.querySelector<HTMLElement>('#game-root')!;
  const shell = document.querySelector<HTMLElement>('#game-shell')!, dialog = document.querySelector<HTMLDialogElement>('#game-dialog')!;
  const content = document.querySelector<HTMLElement>('#dialog-content')!, status = document.querySelector<HTMLElement>('#app-status')!;
  const hintButton = document.querySelector<HTMLButtonElement>('#hint')!, cascadeButton=document.querySelector<HTMLButtonElement>('#cascade')!, pointer = document.querySelector<HTMLElement>('#tutorial-pointer')!;
  const warning = document.querySelector<HTMLElement>('#save-status')!, retry = document.querySelector<HTMLButtonElement>('#save-retry')!;
  const sessionPlay = document.querySelector<HTMLButtonElement>('#session-play')!;
  const progress = new ProgressStore(platform.storage), listeners: Array<() => void> = [];
  const cueQA = createA1CueQA(platform.storage, () => platform.ads.rewardedState.playtest);
  const helpOffers=createHelpOffers(progress,platform.ads,platform.analytics,()=>language,()=>scene.visibleHelpCandidates());
  let alive = true, loaded = false, loadSlow = false, control = false, requestingAd = false;
  let selectedControl = 0;
  const pilot=reviewOptions.pilot;
  const loadControl = (index: number, restart=false): void => { const level = reviewFields[index]; if (!level) return; selectedControl = index; const saved=restart?undefined:pilot?.restore(index); scene.loadAttempt(new Board(level, saved?.id??crypto.randomUUID(),saved),null,false,null,false,!!saved);pilot?.save(index,scene.board.snapshot()); };
  let activeDate: string | null = null, calendarDay = localDate();
  const active = () => activeDate ? progress.state.daily[activeDate]! : progress.state.campaign;
  const gameMode = () => activeDate ? 'daily' as const : 'campaign' as const;
  const activeBoard = () => { const a = active(); return new Board(a.level, a.board.id, a.board); };
  const requestedRewards = new Set<string>();
  let holdTimer: ReturnType<typeof setTimeout> | undefined, cameraTimer: ReturnType<typeof setTimeout> | undefined;
  let modal: 'pause' | 'controls' | 'restart' | 'lost' | 'cascade' | null = null;
  let cascadeOffer:HelpOffer|null=null;
  let restartChoice:ReturnType<typeof helpOffers.captureChoice>=null;
  let notice = '', idleMs = 0, pendingTime = 0, pendingAdTime = 0, lastTime = performance.now(), wasActive = false, lastFlush = lastTime;
  let lastSaveError: string | null = null;
  let assistance: { attempt: string; lives?: { from: number; to: number }; hint?: string } | null = null, assistanceScheduled=false;
  let knownAwards = new Set<string>(), knownIndex = -1;
  let names = [text.straightName, text.bentName, text.hardName, text.nightmareName];
  const tutorial = (): string | null => {
    const step = !control && !activeDate && tutorialFor(progress.state.index); return step && !progress.state.tutorials.includes(step) ? step : null;
  };
  const sample = (): void => {
    const now = performance.now(), delta = Math.max(0, Math.min(1000, now - lastTime)); lastTime = now;
    if (wasActive) { pendingTime += delta; if (!tutorial()) { idleMs += delta; pendingAdTime += delta; } }
    wasActive = loaded && meta.screen === 'game' && !control && !requestingAd && !motion.routeBusy && !platform.activity.isBlocked() && !scene.board.complete && scene.board.hearts > 0;
  };
  const takeTime = (): [number, number] => { sample(); const times: [number, number] = [Math.round(pendingTime), Math.round(pendingAdTime)]; pendingTime = 0; pendingAdTime = 0; return times; };
  const run = (task: Promise<unknown>): void => { void task.catch(() => { if (alive) { notice = text.saveFailed; sync(); } }); };
  const saveView = (): void => {
    if (!loaded || meta.screen !== 'game' || control || !alive || progress.uncertain) return;
    run(progress.presentation(scene.board.attemptId, { view: scene.boardCamera.snapshot(), guides: scene.guides }, ...takeTime()));
  };
  const scheduleView = (): void => {
    if (cameraTimer !== undefined) clearTimeout(cameraTimer);
    cameraTimer = setTimeout(() => { cameraTimer = undefined; saveView(); }, 400);
  };
  const finishTutorial = (step: string): void => {
    if (control || tutorial() !== step) return;
    run(progress.tutorial(step).then(changed => { if (changed) platform.analytics.track('tutorial_step', { step, outcome: 'completed' }); }));
  };
  const manualZoom = (previous: Point, current: Point, ratio: number): void => {
    const before = scene.boardCamera.scale;
    scene.zoom(previous, current, ratio); scheduleView();
    if (!loaded || control || meta.screen !== 'game' || progress.state.tutorials.includes('zoom') || Math.abs(scene.boardCamera.scale - before) < .01) return;
    run(progress.tutorial('zoom').then(changed => { if (changed) platform.analytics.track('tutorial_step', { step: 'zoom', outcome: 'completed' }); }));
  };
  const point = (event: PointerEvent | WheelEvent): Point => ({ x: event.clientX, y: event.clientY });
  const inBoard = (p: Point): boolean => {
    const v = scene.playArea; return p.x >= v.x + 12 && p.y >= v.y && p.x <= v.x + v.width - 12 && p.y <= v.y + v.height;
  };
  const cueMoment = (): A1CueMoment | null => {
    const a = active();
    if (cueQA.mode(a.board.id) === 'off') return null;
    if (!alive || !loaded || control || meta.screen !== 'game' || scene.board.attemptId !== a.board.id || modal || tutorial() || requestingAd || transition.busy || platform.activity.isBlocked() || document.hidden || motion.arrivalBusy || !motion.hintSettled(hintButton) || assistance || pendingAward || hintButton.hidden || hintButton.disabled || hintButton.hasAttribute('data-pressed') || !progress.available || progress.uncertain || scene.board.complete || scene.board.hearts === 0 || a.hint !== null || progress.currentHelp(a.board.id)) return null;
    const assigned = progress.state.helpLedger.assignments[a.board.id];
    if (assigned !== 'single-v2') return null;
    const { offer, reserve } = helpOffers.snapshot(a.board.id);
    if (reserve || !offer || offer.variant !== 'single-v2' || offer.kind !== 'single-v2') return null;
    if (platform.ads.rewardedState.phase !== 'ready') return null;
    const episode = helpOffers.captureChoice();
    return { owner: offer.owner, activeMs: a.activeMs, board: JSON.stringify(a.board), errors: a.board.errors.length, effect: 'single-v2', source: 'advertisement', readiness: 'ready', offerId: offer.id, ...(episode?.attempt === a.board.id ? { episodeId: episode.id } : {}) };
  };
  const errorCue = createA1ErrorCue(cueQA, motion, hintButton, cueMoment, () => scene.hasErrorMotion || motion.impactBusy);
  const gestures = new BoardGestures({
    hit(p) {
      if (!inBoard(p) || requestingAd || motion.routeBusy || platform.activity.isBlocked() || progress.uncertain || scene.board.hearts === 0 || scene.board.complete) return null;
      const world = scene.boardCamera.world(p);
      const candidates = scene.board.remaining.map(a => ({ id: a.id, distance: distanceToPath(world, a.path) * scene.boardCamera.scale }))
        .filter(a => a.distance <= 11).sort((a, b) => a.distance - b.distance || a.id.localeCompare(b.id));
      if (candidates[1] && candidates[1].distance - candidates[0]!.distance < 1.5) return null;
      return candidates[0]?.id ?? null;
    },
    contains(id, p) {
      const arrow = scene.board.remaining.find(a => a.id === id);
      return !!arrow && inBoard(p) && distanceToPath(scene.boardCamera.world(p), arrow.path) * scene.boardCamera.scale <= 13;
    },
    activate(id) {
      if (requestingAd || motion.routeBusy || platform.activity.isBlocked()) return;
      if (control) { scene.activate(id); pilot?.save(selectedControl,scene.board.snapshot());return; }
      helpOffers.choice('continued_play');
      const expected = scene.board.attemptId;
      const cueBefore = errorCue.beforeMove(); // Before takeTime/sample can reveal Hint.
      run(progress.move(expected, id, ...takeTime()).then(result => errorCue.accepted(cueBefore, result)));
    },
    emptyTap(p) {
      if (!loaded || meta.screen !== 'game' || !inBoard(p) || requestingAd || motion.routeBusy || platform.activity.isBlocked() || progress.uncertain || scene.board.complete || scene.board.hearts === 0) return;
      // Ambiguous arrow picks are not empty space. Keep their existing safe rejection.
      const world = scene.boardCamera.world(p);
      if (scene.board.remaining.some(a => distanceToPath(world, a.path) * scene.boardCamera.scale <= 13)) return;
      motion.emptyTap(root, p); platform.feedback.play('button');
    },
    press:id=>scene.setPress(id),
    preview: id => scene.setPreview(id),
    pan: (dx, dy) => { scene.pan(dx, dy); scheduleView(); },
    pinch: manualZoom,
  });
  const cancel = (): void => { errorCue.cancel(); if (holdTimer !== undefined) clearTimeout(holdTimer); holdTimer = undefined; gestures.cancel(); motion.clearTaps(); };
  const close = (after: ()=>void = () => {}): void => { modal = null;restartChoice=null;cascadeOffer=null; motion.close(dialog, () => { platform.activity.setBlocked('dialog', false); if(meta.screen === 'game')root.focus({ preventScroll: true }); after(); }); };
  const loadActive = (): void => {
    cancel(); pendingTime = 0; pendingAdTime = 0; wasActive = false; freshWinAttempt = ''; dailyReturnAttempt=''; idleMs = 0; notice = '';
    const a = active(); celebratedAttempt = a.board.removed.length === a.level.arrows.length ? a.board.id : ''; pendingAward = false;
    scene.loadAttempt(activeBoard(), a.view, a.guides, a.hint, false, true);scene.setAssistance(progress.currentHelp(a.board.id)?.plan??null,true); sync(); scene.layout(); scheduleView(); sync();
  };
  const resumeErrors = (): void => {
    const attempt=scene.board.attemptId;
    const apply=():void=>{if(alive && meta.screen==='game' && !control && !platform.activity.isBlocked() && scene.board.attemptId===attempt)run(progress.releaseReadyErrors(attempt));};
    if(!motion.deferRoute(apply))apply();
  };
  const enterCampaign = (): void => { const intent = meta.revision; run((async () => {
    await progress.flush();
    if (!alive || meta.revision !== intent) return;
    if (progress.board.complete && progress.state.index < campaign.length - 1) { const mode = cueQA.next; if (await progress.next(progress.board.attemptId)) cueQA.bindNew(progress.state.campaign.board.id, mode); }
    if (!alive || meta.revision !== intent) return; control = false; activeDate = null;
    meta.selectCampaign(); loadActive(); meta.show('game', undefined, scene.artwork()); sync(); root.focus({ preventScroll: true }); resumeErrors();
  })()); };
  const leaveGame = (): void => {
    helpOffers.choice('exit');
    if(activeDate && dailyReturnAttempt===scene.board.attemptId && scene.board.complete)meta.queueDailyArrival(activeDate,dailyReturnAttempt);
    dailyReturnAttempt='';
    assistance=null; motion.cancelRefill(); cancel(); saveView();if(!control)run(progress.recordHelpExit(scene.board.attemptId)); if (cameraTimer !== undefined) clearTimeout(cameraTimer); cameraTimer = undefined;
    if (!control && active().started) platform.analytics.track('level_exit', { mode: gameMode(), level_id: active().level.id, attempt: active().board.id, active_ms: active().activeMs });
    pendingTime = 0; pendingAdTime = 0; wasActive = false; freshWinAttempt = '';
  };
  const meta = installMetaSurface(progress, language, {
    motion,
    canPresent: () => !document.hidden && !requestingAd && platform.activity.getBlockReasons().every(reason=>reason==='menu'),
    blocked: value => platform.activity.setBlocked('menu', value),
    previewBlocked: value => platform.activity.setBlocked('trophy-preview', value), leaveGame, enterCampaign,
    visited: screen => platform.analytics.track('screen_view', { screen }),
    artwork: () => !activeDate && !control ? scene.artwork() : null,
    ...(reviewFields.length ? { controls: () => open('controls') } : {}), settings: () => settingsSurface.open(),
    async enterDaily(date,signal) {
      const intent = meta.revision;
      await progress.flush(); const existed = !!progress.state.daily[date], mode = cueQA.next; const attempt = await progress.openDaily(date,signal); if (attempt && !existed) cueQA.bindNew(attempt, mode); if (!attempt || !alive||signal?.aborted) throw Error('Daily unavailable');
      if (meta.revision !== intent) return;
      activeDate = date; control = false; loadActive(); meta.show('game', undefined, scene.artwork()); sync(); root.focus({ preventScroll: true }); resumeErrors();
      platform.analytics.track('daily_open', { date, attempt, resumed: active().started });
    },
  });
  const settingsSurface = installSettingsSurface(platform.settings, platform.activity, platform.feedback, () => { cancel(); saveView(); }, motion,()=>{if(pilot)return null;const section = helpOffers.renderQA(), cue = cueQA.render(language, active().board.id); if (section && cue) section.append(cue); return section;});
  let celebratedAttempt = '', pendingAward = false, freshWinAttempt = '', dailyReturnAttempt = '';
  const backToMenu = (): void => { if (requestingAd || transition.busy) return;if(pilot){open('controls');return;} if (activeDate && !control) meta.show('calendar', activeDate); else meta.show('home'); close(); sync(); };
  let rewardIntent = 0, lastPreload = -Infinity, pendingRewardKey = '';
  const cancelAd = (): void => {
    if (platform.ads.state.phase !== 'idle') { platform.ads.cancel(); return; }
    rewardIntent++; requestedRewards.delete(pendingRewardKey); pendingRewardKey = ''; requestingAd = false; adSurface.endPreparation(); sync();
  };
  const adSurface = installAdSurface(platform.ads, () => language, cancelAd);
  const transition = createAdTransition(platform.activity, () => sync(), () => { notice = text.saveFailed; sync(); });
  const requestReward = async (placement: 'hint' | 'lives',cascade?:HelpOffer): Promise<void> => {
    errorCue.cancel('help-activation');
    if (requestingAd || transition.busy || !progress.available || progress.uncertain) return;
    const selected=helpOffers.snapshot(scene.board.attemptId,cascade?'cascade':placement);
    // The described group is frozen while the dialog is open. Late assistance
    // takes priority; never substitute a different offer on the confirmation tap.
    if(cascade&&(!selected.offer||selected.reserve||selected.offer.id!==cascade.id)){close();return;}
    if(selected.reserve){helpOffers.choice('claim');await progress.claimHelp(scene.board.attemptId,selected.reserve.id);return;}
    if(!selected.offer)return;
    const offer=selected.offer;helpOffers.choice('accept','',helpOffers.captureChoice(cascade?'cascade':placement));
    const intent = ++rewardIntent, attempt = scene.board.attemptId, mode = gameMode(); requestingAd = true;
    const dialogClosed = new Promise<void>(resolve => close(resolve)); adSurface.prepare();
    const requestKey = `${attempt}:${placement}`; requestedRewards.add(requestKey); pendingRewardKey = requestKey;
    if (placement === 'hint') platform.analytics.track('hint_request', { attempt });
    try {
      await dialogClosed; if (!alive || rewardIntent !== intent) return;
      const descriptor=await progress.prepareHelpRequest(offer); if (!alive || rewardIntent !== intent) return;
      if(!descriptor){notice=text.videoUnavailable;return;}
      const outcome = await platform.ads.show({ kind: 'rewarded', placement, attempt, mode,requestId:descriptor.requestId,intentVersion:1,context:helpOffers.context(attempt,descriptor.variant) });
      if (!alive || rewardIntent !== intent) return;
      if (!outcome.shown) { notice = outcome.outcome === 'cancelled' ? text.videoCancelled : text.videoUnavailable; requestedRewards.delete(requestKey); }
      else if (!progress.state.receipts.includes(outcome.requestId ?? '')) notice = outcome.earned ? text.rewardPending : text.videoClosed;
      if (!outcome.earned) requestedRewards.delete(requestKey);
    } finally { if (alive && rewardIntent === intent) { requestingAd = false; pendingRewardKey = ''; adSurface.endPreparation(); sync(); } }
  };
  const advanceWin = (): void => {
    if (control) {if(pilot&&scene.board.complete&&scene.finished&&selectedControl+1<reviewFields.length){loadControl(selectedControl+1);sync();}else open('controls'); return; }
    if (!scene.board.complete || !scene.finished || requestingAd || transition.busy) return;
    platform.feedback.resetGameplay();
    const attempt = scene.board.attemptId, date = activeDate, mode = gameMode(), levelId = scene.board.level.id, freshWin = freshWinAttempt === scene.board.attemptId, animateDaily = !!date && dailyReturnAttempt===attempt, finalCampaign = !date && progress.state.index===campaign.length-1; freshWinAttempt = ""; dailyReturnAttempt="";
    transition.start(async () => {
      cancel(); saveView(); await progress.flush();
      if(finalCampaign)return false;
      const reason = !freshWin ? 'restored_result' : platform.kind !== 'android' ? 'unsupported' : !progress.available || progress.uncertain ? 'save_unavailable' : interstitialReason(progress.state.adCadence, progress.confirmedWins);
      platform.analytics.track('ad_opportunity', { reason, attempt, mode, level_id: levelId });
      return reason === 'eligible' && !!await progress.consumeInterstitial(attempt);
    }, () => platform.ads.show({ kind: 'interstitial', placement: 'continue', attempt, mode,context:helpOffers.context(attempt) }), async () => {
      if (date) {if(animateDaily)meta.queueDailyArrival(date,attempt);meta.show('calendar', date);} else if(finalCampaign)meta.show('calendar');else { const selected = cueQA.next; if (await progress.next(attempt)) cueQA.bindNew(progress.state.campaign.board.id, selected); }
    });
  };
  const open = (kind: NonNullable<typeof modal>): void => {
    if (kind === 'controls' && !reviewFields.length) return;
    restartChoice=kind==='restart'?(modal==='restart'?restartChoice:helpOffers.captureChoice()):null;
    const confirmedChoice=restartChoice;
    cascadeOffer=kind==='cascade'?helpOffers.snapshot(scene.board.attemptId,'cascade').offer:null;
    if(kind==='cascade'&&!cascadeOffer)return;
    const confirmedCascade=cascadeOffer;
    cancel(); saveView(); modal = kind;dialog.dataset.kind=kind; platform.activity.setBlocked('dialog', true); content.replaceChildren();
    const title = document.createElement('h2'); title.id = 'dialog-title';
    title.textContent = kind==='cascade'?(language==='ru'?'Каскад':'Cascade'):kind === 'pause' ? `${text.level} ${progress.state.index + 1}` : kind === 'controls' ? text.chooseField : kind === 'lost' ? text.noLives : text.restartQuestion;
    content.append(title);
    const button = (key: string, label: string, action: () => void, primary = false): void => {
      const el = document.createElement('button'); el.type = 'button'; el.dataset.action = key; el.textContent = label;
      if (primary) el.className = 'primary'; el.addEventListener('click', action); content.append(el);
    };
    const paragraph = (value: string): void => { const p = document.createElement('p'); p.textContent = value; content.append(p); };
    if(kind==='cascade'&&confirmedCascade){
      paragraph(language==='ru'?`После видео покажем пусковую стрелку и точную группу. Нажмите пусковую — следом автоматически уйдут ещё ${confirmedCascade.amount} стрелки.`:`After the video, see the trigger and exact group. Tap the trigger to remove ${confirmedCascade.amount} more arrows automatically.`);
      button('rewarded-cascade',language==='ru'?`Каскад +${confirmedCascade.amount} · видео`:`Cascade +${confirmedCascade.amount} · video`,()=>run(requestReward('hint',confirmedCascade)),true);
      button('cancel',text.cancel,()=>close());
    } else if (kind === 'pause') {
      paragraph(control ? text.controlMode : activeDate ? activeDate : `${text.chapter}: ${progress.state.wins.length} / ${campaign.length}`);
      button('home', activeDate ? text.challenge : text.home, backToMenu);
      button('resume', text.resume, () => close(), true);
      if (control) button('campaign', text.toCampaign, () => { close(); enterCampaign(); });
      if (reviewFields.length) button('controls', text.controlFields, () => open('controls'));
    } else if (kind === 'controls') {
      if(pilot){paragraph(pilot.description(language));button('compare',language==='ru'?'Сравнить с другим банком':'Compare the other bank',()=>pilot.compare(selectedControl));}
      for (let index = 0; index < reviewFields.length; index++) button(`field-${index}`, pilot?.label(index,language)??names[index]!, () => { close(); saveView(); control = true; idleMs = 0; meta.show('game'); loadControl(index); sync(); }, index === selectedControl && control);
      button('campaign', text.toCampaign, () => {if(pilot){pilot.exit();return;} close(); enterCampaign(); });
    } else if (kind === 'restart') {
      button('confirm-restart', text.restart, () => {
        close(); if (control) loadControl(selectedControl,true);
        else {
          const a = scene.board, mode = gameMode(),beforeMs=active().activeMs, cueMode=cueQA.next, date=activeDate;run(progress.restart(a.attemptId).then(changed => { if (changed) {cueQA.bindNew(mode === 'daily' ? progress.state.daily[date!]!.board.id : progress.state.campaign.board.id, cueMode);helpOffers.choice('restart','',confirmedChoice,a.attemptId);platform.analytics.track('level_restart', { mode, level_id: a.level.id, attempt: a.attemptId });platform.analytics.track('attempt_final',{event_id:`${a.attemptId}-restart`,attempt:a.attemptId,mode,outcome:'restart',active_ms:beforeMs});} }));
        }
      }, true);
      button('cancel', text.cancel, () => close());
    } else if (kind === 'lost') {
      if (!control && !helpOffers.snapshot(scene.board.attemptId,'lives').reserve && !progress.state.freeContinueUsed && !active().freeUsed) { paragraph(text.freeContinueNote); button('free-continue', text.freeContinue, () => {
        const attempt = scene.board.attemptId; run(progress.continueFree(attempt).then(changed => { if (changed) platform.analytics.track('continue_applied', { attempt, source: 'free' }); }));
      }, true); }
      else if (!control) { const offer=helpOffers.livesLabel(scene.board.attemptId);paragraph(offer.detail);button('rewarded-continue',offer.text,()=>run(requestReward('lives')),true); }
      button('restart', text.restart, () => open('restart'), control);
      button('home', activeDate ? text.toCalendar : text.home, backToMenu);
      if (notice) paragraph(notice);
    } else {
      button('cancel', text.cancel, () => close());
    }
    motion.open(dialog);
  };
  const scheduleAssistance = (): void => {
    if(!assistance || assistanceScheduled)return;
    assistanceScheduled=true;
    // Feedback eligibility listeners finish before a newly unblocked cue is submitted.
    queueMicrotask(()=>{
      assistanceScheduled=false; const effect=assistance; if(!effect)return;
      if(!alive || meta.screen!=='game' || scene.board.attemptId!==effect.attempt || scene.board.complete){assistance=null;return;}
      if(requestingAd || transition.busy || motion.routeBusy || platform.activity.isBlocked())return;
      assistance=null;
      if(effect.lives && scene.board.hearts===effect.lives.to){motion.refill(document.querySelector<HTMLElement>('#hearts')!,effect.lives.from,effect.lives.to);platform.feedback.play('life');}
      if(effect.hint && scene.hintTarget===effect.hint){helpOffers.reveal(effect.attempt,'reveal_started');scene.revealHint(effect.hint);}
    });
  };
  const sync = (): void => {
    if (!alive) return;
    const board = scene.board, a = active(), remaining = board.remaining.length;
    const dailyLabel = activeDate ? new Intl.DateTimeFormat(language, { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(activeDate + 'T12:00:00Z')) : '';

    document.querySelector('#app-title')!.textContent = control ? pilot?.label(selectedControl,language)??text.title : activeDate ? dailyLabel : `${text.level} ${progress.state.index + 1}`;
    document.querySelector('#choose-field')!.setAttribute('aria-label', activeDate && !control ? text.toCalendar : text.home);
    document.querySelector('#field-name')!.textContent = control ? pilot?`${selectedControl+1} / ${reviewFields.length}`:names[selectedControl]! : activeDate ? dailyLabel : `${progress.state.index + 1} / ${campaign.length}`;
    const difficulty = document.querySelector<HTMLElement>('#difficulty')!;
    difficulty.textContent = board.level.difficulty === 'normal' ? '' : board.level.difficulty === 'hard' ? 'Hard' : 'Nightmare';
    difficulty.dataset.difficulty = board.level.difficulty;
    document.querySelector<HTMLElement>('.heading')!.dataset.difficulty = board.level.difficulty;
    const hearts = document.querySelector<HTMLElement>('#hearts')!; hearts.setAttribute('aria-label', `${text.lives}: ${board.hearts}`);
    Array.from(hearts.children).forEach((heart, i) => heart.classList.toggle('empty', i >= board.hearts));
    document.querySelector<HTMLElement>('#progress-fill')!.style.transform = `scaleX(${1 - remaining / board.level.arrows.length})`;
    document.querySelector('#board-progress')!.setAttribute('aria-valuenow', String(board.level.arrows.length - remaining));
    document.querySelector('#board-progress')!.setAttribute('aria-valuemax', String(board.level.arrows.length));
    Object.assign(shell.dataset, { mode: control ? 'control' : gameMode(), level: board.level.id, remaining: String(remaining), lives: String(board.hearts), attempt: board.attemptId,
      state: board.complete ? 'complete' : board.hearts === 0 ? 'lost' : 'playing', progress: loaded ? 'ready' : 'loading', save: progress.uncertain ? 'uncertain' : progress.available ? 'available' : 'session-only' });
    root.dataset.camera = JSON.stringify({ x: scene.boardCamera.x, y: scene.boardCamera.y, scale: scene.boardCamera.scale });
    document.querySelector('#guides')!.setAttribute('aria-pressed', String(scene.guides));
    document.querySelector<HTMLElement>('#guides')!.hidden = board.complete;
    document.querySelector<HTMLElement>('#win')!.hidden = !scene.finished;
    const exhausted = !control && !activeDate && progress.state.index === campaign.length - 1;
    const winTitle=document.querySelector('#win-title')!, title=exhausted ? text.chapterComplete : activeDate ? text.dailyWin : text.win;
    if(winTitle.textContent!==title)winTitle.textContent=title;
    document.querySelector<HTMLButtonElement>('#next')!.textContent = control ? pilot&&selectedControl+1<reviewFields.length?text.next:text.chooseField : activeDate || exhausted ? text.toCalendar : text.next;
    document.querySelector<HTMLButtonElement>('#next')!.disabled = transition.busy || requestingAd;
    document.querySelector<HTMLButtonElement>('#restart')!.disabled = !control && board.complete || board.hearts === 0;
    document.querySelector<HTMLButtonElement>('#game-settings')!.disabled = board.hearts === 0;
    document.querySelector<HTMLButtonElement>('#guides')!.disabled = board.hearts === 0;
    document.querySelector<HTMLElement>('#win')!.dataset.flawless=String(board.snapshot().errors.length===0);
    const detail=document.querySelector('#win-detail')!, result=board.snapshot().errors.length === 0 ? text.flawless : text.cleared;
    if(detail.textContent!==result)detail.textContent=result;
    const step = board.complete ? null : tutorial();
    // Isolated-QA experiment: never participates in tutorial(), Hint or ad clocks.
    const scaleContext = reviewOptions.scaleContext && !control && !board.complete && board.hearts > 0 && !progress.state.tutorials.includes('zoom') && scene.boardCamera.scale < 12 && scene.boardCamera.snapshot().zoom < 1.15;
    let statusText = !loaded ? text.restoring : notice || (step ? text[`teach_${step}` as keyof typeof text] : scaleContext || control && remaining === board.level.arrows.length ? text.zoomTip : '');
    const hintWasHidden = hintButton.hidden;
    hintButton.hidden = !loaded || control || board.complete || board.hearts === 0 || !!step || idleMs < 3000 || a.hint !== null;
    if (hintWasHidden && !hintButton.hidden) motion.hintReady(hintButton);
    const cascadeWasHidden=cascadeButton.hidden;
    cascadeButton.hidden=hintButton.hidden||!helpOffers.snapshot(a.board.id,'cascade').offer;
    const cascadeLabel=language==='ru'?'Каскад':'Cascade';if(cascadeButton.textContent!==cascadeLabel)cascadeButton.textContent=cascadeLabel;
    cascadeButton.setAttribute('aria-label',language==='ru'?'Каскад за видео — узнать подробнее':'Cascade for a video — details');
    if(cascadeWasHidden&&!cascadeButton.hidden)motion.hintReady(cascadeButton);
    if(loaded&&!control&&meta.screen==='game'){
      const label=helpOffers.label(a.board.id),copy=hintButton.querySelector('[data-help-label]');
      if(copy&&copy.textContent!==label.text)copy.textContent=label.text;
      const phase=platform.ads.rewardedState.phase,ru=language==='ru';
      const state=label.reserved?(label.kind==='cascade-v1'?`${label.detail} · ${ru?'без видео':'no video'}`:label.detail):phase==='ready'?'':phase==='loading'||phase==='initializing'?ru?'Видео загружается':'Video loading':phase==='backoff'?ru?'Попробуйте позже':'Try later':phase==='unavailable'||phase==='disabled'?ru?'Видео пока недоступно':'Video unavailable':ru?'Проверим видео':'Check video';
      if(!hintButton.hidden&&!statusText)statusText=state;
      const video=hintButton.querySelector<SVGElement>('.video-mark');if(video)video.style.display=label.reserved?'none':'';
      hintButton.dataset.helpEffect=label.kind;hintButton.dataset.readiness=phase;hintButton.dataset.helpReserved=String(label.reserved);hintButton.title=label.detail;hintButton.setAttribute('aria-label',label.text);
      shell.dataset.helpVariant=progress.state.helpLedger.assignments[a.board.id]??progress.state.helpLedger.nextVariant;
    }
    if(status.textContent!==statusText)status.textContent=statusText;
    const guideLabel=document.querySelector<HTMLElement>('#guides-label')!; guideLabel.hidden = step !== 'guides'; guideLabel.textContent=text.guideShort;
    hintButton.disabled = requestingAd || !progress.available || progress.uncertain;
    cascadeButton.disabled=hintButton.disabled;
    warning.hidden = progress.error === null && !loadSlow;
    document.querySelector('#save-message')!.textContent = loadSlow ? text.restoring : progress.error === 'load' ? text.sessionOnly : progress.error === 'uncertain' ? text.saveUncertain : text.saveFailed;
    retry.hidden = loadSlow; sessionPlay.hidden = !loadSlow;
    retry.textContent = text.retrySave;
    pointer.hidden = meta.screen !== 'game' || step !== 'tap' || board.complete || modal !== null;
    if (!pointer.hidden) {
      const arrow = board.remaining.find(v => v.id === board.hint());
      if (arrow) { const p = scene.boardCamera.screen(arrow.path.at(-1)!); pointer.style.left = `${p.x}px`; pointer.style.top = `${p.y}px`; }
    }
    platform.activity.setGameplayDesired(loaded && meta.screen === 'game' && !board.complete && board.hearts > 0);
    if (modal === 'lost' && board.hearts > 0) close();
    if(modal==='cascade'&&cascadeOffer){const current=helpOffers.snapshot(board.attemptId,'cascade');if(current.reserve||current.offer?.id!==cascadeOffer.id)close();}
    if (loaded && meta.screen === 'game' && board.hearts === 0 && !scene.hasErrorMotion && modal === null && !requestingAd && !motion.routeBusy) open('lost');
    if(modal==='lost'&&content.querySelector('[data-action=rewarded-continue]')){const offer=helpOffers.livesLabel(board.attemptId),p=content.querySelector('p'),button=content.querySelector<HTMLElement>('[data-action=rewarded-continue]')!;if(p&&p.textContent!==offer.detail)p.textContent=offer.detail;if(button.textContent!==offer.text)button.textContent=offer.text;}
    const foreground=!document.hidden&&platform.activity.getBlockReasons().every(reason=>reason==='dialog');
    const showHint=loaded&&!control&&meta.screen==='game'&&!hintButton.hidden&&!requestingAd&&!motion.routeBusy&&!platform.activity.isBlocked();
    const showLives=loaded&&!control&&meta.screen==='game'&&modal==='lost'&&dialog.open&&!requestingAd&&!motion.routeBusy&&foreground&&!!content.querySelector('[data-action="rewarded-continue"]');
    helpOffers.visible(showHint||showLives,board.attemptId,showLives?'lives':'hint');
    helpOffers.visible(showHint&&!cascadeButton.hidden||modal==='cascade'&&dialog.open&&foreground&&!requestingAd&&!motion.routeBusy&&!!cascadeOffer,board.attemptId,'cascade');
    platform.ads.setRewardedDemand(loaded&&!control&&meta.screen==='game'&&!board.complete&&(!a.hint||showLives)&&!step&&!requestingAd&&!motion.routeBusy&&progress.available&&!progress.uncertain&&(showLives||!platform.activity.isBlocked()&&board.hearts>0));
    scheduleAssistance();
    meta.presentArrivals();
    void cueQA.load();
    errorCue.refresh();
  };
  const onChange = (event: SaveChange): void => {
    if (!alive) return;
    if (event.kind === 'load' || event.kind === 'move' && event.result?.kind !== 'ignored' || event.helpFacts?.length || event.continueFacts?.length) errorCue.cancel('accepted-change', false);
    helpOffers.facts(event);
    if(event.kind==='load'){dailyReturnAttempt='';meta.discardAward();meta.discardArrivals();}
    if (activeDate && !progress.state.daily[activeDate]) { activeDate = null; meta.show('home'); }
    if (progress.error !== lastSaveError) {
      lastSaveError = progress.error;
      if (lastSaveError) platform.analytics.track('save_error', { operation: lastSaveError === 'load' ? 'load' : 'write', reason: lastSaveError });
    }
    const a = active(), previousLives = scene.board.hearts, previousHint = scene.hintTarget, sameAttempt = scene.board.attemptId === a.board.id;
    if (!control && meta.screen === 'game') {
      if (scene.board.attemptId !== a.board.id || event.kind === 'load') {
        const advancing=event.kind!=='load' && scene.board.complete; assistance=null; motion.cancelRefill();
        platform.feedback.resetGameplay(); cancel(); idleMs = 0; pendingTime = 0; notice = ''; scene.loadAttempt(activeBoard(), a.view, a.guides, a.hint, advancing);
        if (!activeDate) meta.selectCampaign();
        if(advancing)motion.reveal(document.querySelector('#app-title')!);
      } else {
        scene.acceptBoard(activeBoard(), event.attempt === a.board.id ? event.result : undefined);
        if (scene.guides !== a.guides) scene.setGuides(a.guides);
        if (scene.hintTarget !== a.hint) { scene.setHint(a.hint); scheduleView(); }
      }
      scene.setAssistance(progress.currentHelp(a.board.id)?.plan??null,event.kind==='load');
      if (event.kind !== 'load' && sameAttempt) {
        if(a.board.lives<previousLives)motion.cancelRefill();
        const lives=a.board.lives>previousLives?{from:previousLives,to:a.board.lives}:undefined, hint=a.hint&&a.hint!==previousHint&&event.kind!=='move'?a.hint:undefined;
        if(lives || hint){
          const hard=platform.activity.getBlockReasons().some(reason=>!['menu','dialog','settings','trophy-preview'].includes(reason));
          const requested=requestedRewards.has(`${a.board.id}:${lives?'lives':'hint'}`);
          if(!hard || requestingAd || requested)assistance={...(assistance?.attempt===a.board.id?assistance:{}),attempt:a.board.id,...(lives?{lives}:{}),...(hint?{hint}:{})};
        }
      }
      if (event.kind === 'load' && a.started && !scene.board.complete) platform.analytics.track('level_resume', { mode: gameMode(), level_id: a.level.id, attempt: a.board.id });
    }
    if (event.kind === 'move' && event.result?.kind !== 'ignored' && event.attempt) {
      const owner = progress.findAttempt(event.attempt), moved = owner?.saved;
      if (moved && owner) {
        if (event.startedNow) platform.analytics.track('level_start', { mode: owner.mode, level_id: moved.level.id, content_version: moved.level.contentVersion, attempt: moved.board.id, resumed: false });
        if (event.result?.kind === 'error') {platform.analytics.track('level_error', { mode: owner.mode, level_id: moved.level.id, attempt: moved.board.id, first: event.result.first, lives: moved.board.lives });if(event.result.first&&moved.board.lives===0)platform.analytics.track('attempt_loss',{event_id:`${moved.board.id}-loss-${moved.board.errors.length}`,attempt:moved.board.id,mode:owner.mode,mistakes:moved.board.errors.length});}
        if (event.result?.kind === 'removed') {
          if (scene.board.attemptId === moved.board.id) { idleMs = 0; notice = ''; const step = tutorial(); if (step && ['tap', 'turns', 'blockers'].includes(step)) finishTutorial(step); }
          if (event.result.complete) {
            if (meta.screen === 'game' && scene.board.attemptId === moved.board.id) freshWinAttempt = moved.board.id;
            platform.analytics.track('level_complete', { mode: owner.mode, level_id: moved.level.id, attempt: moved.board.id, active_ms: moved.activeMs, mistakes: moved.board.errors.length, first_clear: true });
            platform.analytics.track('attempt_final',{event_id:`${moved.board.id}-completed`,attempt:moved.board.id,mode:owner.mode,outcome:'completed',active_ms:moved.activeMs});
            if (owner.date) platform.analytics.track('daily_complete', { date: owner.date, attempt: moved.board.id });
          }
        }
      }
    }
    const awards = earnedAwards(progress.state);
    if (event.kind !== 'load' && knownIndex >= 0) {
      for (const item of awards) if (!knownAwards.has(item)) { platform.analytics.track('collection_unlock', { item }); if (meta.screen === 'game') { pendingAward = true; scene.setRewardCelebration(); meta.queueAward(); } }
      if (knownIndex < 9 && progress.state.index >= 9) {platform.analytics.track('collection_unlock', { item: 'collection' });meta.queueUnlock('collection');}
      if (knownIndex < 19 && progress.state.index >= 19) {platform.analytics.track('collection_unlock', { item: 'challenge' });meta.queueUnlock('calendar');}
    }
    knownAwards = new Set(awards); knownIndex = progress.state.index;
    meta.refresh();
    sync();
  };
  listeners.push(progress.subscribe(onChange));
  listeners.push(platform.ads.subscribeRewarded(()=>sync()));
  platform.activity.setBlocked('save-load', true);
  const slowLoad = setTimeout(() => { if (!loaded && alive) { loadSlow = true; sync(); } }, 4000);
  const finishLoad = (): void => {
    clearTimeout(slowLoad); if (!alive || loaded) return; loaded = true; loadSlow = false; meta.ready();
    platform.activity.setBlocked('save-load', false);
    if(pilot){control=true;meta.show('game');loadControl(pilot.initial);sync();return;}
    platform.ads.installRewardCommit(async receipt => {
      const result = await progress.commitReward(receipt);
      const recovered = !requestedRewards.delete(`${receipt.attempt}:${receipt.placement}`);
      if (result === 'applied') {
        const right=progress.state.helpLedger.rights[receipt.id],applied=!!right&&(right.status!=='reserved'||right.bundle?.lives==='applied');
        if(!right){platform.analytics.track('runtime_error',{operation:'reward_descriptor',reason:'unresolved'});return result;}
        if (!applied||right.status==='reserved') platform.analytics.track('ad_reward_reserved', { placement: receipt.placement, attempt: receipt.attempt });
        if (applied) {
          if (receipt.attempt === scene.board.attemptId) notice = '';
          platform.analytics.track('ad_reward_granted', { placement: receipt.placement, attempt: receipt.attempt, recovered });
          if (receipt.placement === 'hint') platform.analytics.track('hint_applied', { attempt: receipt.attempt, recovered });
          else platform.analytics.track('continue_applied', { attempt: receipt.attempt, source: 'rewarded' });
        }
      }
      return result;
    });
    sync();
  };
  void progress.load().then(finishLoad);
  const on = <Event extends keyof HTMLElementEventMap>(target: HTMLElement, name: Event, handler: (event: HTMLElementEventMap[Event]) => void, options?: AddEventListenerOptions): void => {
    target.addEventListener(name, handler, options); listeners.push(() => target.removeEventListener(name, handler, options));
  };
  on(root, 'pointerdown', event => {
    if (event.button !== 0 || motion.routeBusy || !inBoard(point(event)) || platform.activity.isBlocked()) return;
    event.preventDefault(); root.setPointerCapture(event.pointerId); gestures.down(event.pointerId, point(event), performance.now());
    if (holdTimer !== undefined) clearTimeout(holdTimer); holdTimer = setTimeout(() => { holdTimer = undefined; gestures.hold(performance.now()); }, 305);
  });
  on(root, 'pointermove', event => gestures.move(event.pointerId, point(event)));
  on(root, 'pointerup', event => { if (holdTimer !== undefined) clearTimeout(holdTimer); gestures.up(event.pointerId, point(event), performance.now()); if (root.hasPointerCapture(event.pointerId)) root.releasePointerCapture(event.pointerId); });
  on(root, 'pointercancel', cancel); on(root, 'lostpointercapture', event => { if (gestures.hasPointer(event.pointerId)) cancel(); });
  on(root, 'wheel', event => {
    if (motion.routeBusy || !inBoard(point(event)) || platform.activity.isBlocked()) return;
    event.preventDefault(); cancel(); manualZoom(point(event), point(event), Math.exp(-event.deltaY * .0015));
  }, { passive: false });
  on(document.querySelector<HTMLElement>('#choose-field')!, 'click', backToMenu);
  on(document.querySelector<HTMLElement>('#restart')!, 'click', () => open('restart'));
  on(document.querySelector<HTMLElement>('#guides')!, 'click', () => { cancel(); scene.setGuides(!scene.guides); if (!control) { saveView(); finishTutorial('guides'); } });
  on(document.querySelector<HTMLElement>('#next')!, 'click', advanceWin);
  on(hintButton, 'pointerdown', () => errorCue.cancel('hint-press'));
  on(hintButton, 'keydown', () => errorCue.cancel('hint-key'));
  on(hintButton, 'click', () => { if (!hintButton.hidden && !hintButton.disabled && meta.screen === 'game' && !platform.activity.isBlocked() && !motion.routeBusy) run(requestReward('hint')); });
  on(cascadeButton,'click',()=>{if(!cascadeButton.hidden&&!cascadeButton.disabled&&meta.screen==='game'&&!platform.activity.isBlocked()&&!motion.routeBusy)open('cascade');});
  on(retry, 'click', () => { retry.disabled = true; run(progress.recover().finally(() => { retry.disabled = false; notice = ''; sync(); })); });
  sessionPlay.textContent = text.sessionPlay;
  on(sessionPlay, 'click', () => { progress.startSessionOnly(); finishLoad(); });
  on(dialog, 'cancel', event => { event.preventDefault(); if (modal === 'lost') backToMenu(); else close(); sync(); });
  listeners.push(platform.activity.onBlockedChange(value => { sample(); if (value) { motion.stopRoute(); cancel(); saveView(); if (scene.board.complete) { celebratedAttempt = scene.board.attemptId; pendingAward = false; } scene.settlePresentation(); } }));
  listeners.push(platform.activity.onBlockReasonsChange(() => { if (platform.activity.getBlockReasons().some(reason => !['menu','dialog','settings','trophy-preview'].includes(reason))) { motion.finish(); meta.discardAward(); if(!transition.busy){meta.discardArrivals();dailyReturnAttempt='';} if(!requestingAd)assistance=null; } }));
  listeners.push(scene.subscribe(sync));
  listeners.push(scene.subscribeFeedback(event => {
    if (!loaded || meta.screen !== 'game' || scene.board.attemptId !== event.attempt) return;
    if(event.kind==='route-step')platform.feedback.routeStep(event.routeStep??1);
    else if (event.kind === 'move-start') platform.feedback.play('remove');
    else if (event.kind === 'blocked-start') platform.feedback.play('slide');
    else if (event.kind === 'impact') { platform.feedback.play('error'); motion.impact(document.querySelector('#hearts')!); }
    else if(event.kind==='repeat-impact')platform.feedback.play('repeat-error');
    else if(event.kind==='auto-start')platform.feedback.play('auto');
    else if(event.kind==='help-finish')platform.feedback.play('help-final');
    else if (event.kind === 'hint-ready') {platform.feedback.play('hint');helpOffers.reveal(event.attempt,'reveal_ready');}
    else if (event.kind === 'exit') platform.feedback.play('exit');
    else if (event.kind === 'victory' && celebratedAttempt !== event.attempt) { celebratedAttempt = event.attempt; platform.feedback.play(pendingAward ? 'award' : scene.board.snapshot().errors.length===0 ? 'perfect' : 'win'); pendingAward = false; }
    else if (event.kind === 'win-ready' && (control || freshWinAttempt === event.attempt)) {motion.reward(document.querySelector('#win')!);saveView();if(activeDate)dailyReturnAttempt=event.attempt;}
  }));
  // Menu actions can replace an icon's parent before this bubble listener runs.
  // The dispatch path retains the accepted control through that DOM replacement.
  const uiClick = (event: MouseEvent): void => { const button = event.composedPath().find(node=>node instanceof HTMLElement&&node.matches('button,summary,[role="button"]')) as HTMLElement|undefined; if (button && !button.matches(':disabled') && !button.hasAttribute('data-feedback-preview')) platform.feedback.play('button', 'ui'); };
  document.addEventListener('click', uiClick); listeners.push(() => document.removeEventListener('click', uiClick));
  const observer = new ResizeObserver(() => { cancel(); if (meta.screen === 'game') { scene.layout(); scheduleView(); } });
  observer.observe(document.querySelector('#game-header')!); observer.observe(document.querySelector('#game-footer')!);
  listeners.push(() => observer.disconnect());
  const blur = (): void => { cancel(); saveView(); }; window.addEventListener('blur', blur); listeners.push(() => window.removeEventListener('blur', blur));
  const resizeCue = (): void => errorCue.cancel('resize'); window.addEventListener('resize', resizeCue); listeners.push(() => window.removeEventListener('resize', resizeCue));
  const hide = (): void => { errorCue.cancel('pagehide'); saveView(); }; window.addEventListener('pagehide', hide); listeners.push(() => window.removeEventListener('pagehide', hide));
  const timer = setInterval(() => {
    sample(); sync();
    if (loaded && !control && meta.screen === 'game' && !platform.activity.isBlocked() && progress.confirmedWins >= 4 && progress.state.adCadence.activeMs + pendingAdTime >= 120000 && performance.now() - lastPreload >= 30000) { lastPreload = performance.now(); void platform.ads.prepareInterstitial(); }
    if (calendarDay !== localDate()) { calendarDay = localDate(); meta.refresh(); }
    if (loaded && performance.now() - lastFlush > 15000 && pendingTime > 0) { lastFlush = performance.now(); saveView(); }
  }, 250);
  document.querySelector('#game-settings')!.innerHTML = settingsIcon;
  on(document.querySelector<HTMLElement>('#game-settings')!, 'click', () => { if (!requestingAd && !transition.busy) settingsSurface.open(); });
  const localize = (): void => {
    document.querySelector('#game-settings')!.setAttribute('aria-label', text.settings);
    document.querySelector('#game-root')!.setAttribute('aria-label', text.title);
    document.querySelector('#meta-screen')!.setAttribute('aria-label', text.home);
    document.querySelector('#board-progress')!.setAttribute('aria-label', text.boardProgress);
    document.querySelector('#choose-field')!.setAttribute('aria-label', text.home);
    document.querySelector('#restart')!.setAttribute('aria-label', text.restart);
    document.querySelector('#guides')!.setAttribute('aria-label', text.guides);
    hintButton.innerHTML = `<svg class="hint-bulb" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18h6m-5 3h4M8 14a6 6 0 1 1 8 0c-1 1-1 2-1 3H9c0-1 0-2-1-3Z"/></svg><span class="hint-copy"><span data-help-label>${text.hint}</span></span><svg class="video-mark" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="4"/><path d="m10 9 5 3-5 3Z"/></svg>`; sessionPlay.textContent = text.sessionPlay;
  };
  status.setAttribute('data-help-readiness','');
  hintButton.setAttribute('aria-describedby','app-status');
  localize();
  listeners.push(platform.settings.subscribe(() => {
    const next = platform.settings.state.language;
    if (language === next) return;
    errorCue.cancel('language');
    language = next; text = copy[next]; names = [text.straightName, text.bentName, text.hardName, text.nightmareName];
    notice = ''; meta.setLanguage(next); localize(); if (modal) open(modal); sync();
    platform.analytics.track('language_change', { language: next });
  }));
  sync();
  return {
    onBack(): boolean { if (requestingAd || platform.ads.state.phase !== 'idle') { cancelAd(); return true; } if (transition.busy) return true; if (settingsSurface.close()) return true; if (meta.closeTrophy()) return true; if (modal) { if (modal === 'lost') backToMenu(); else close(); sync(); return true; } if (meta.screen === 'home') return false; if (meta.screen === 'game') backToMenu(); else meta.back(); return true; }, cancel,
    destroy(): void {
      saveView(); alive = false; assistance=null; cancel(); clearInterval(timer); clearTimeout(slowLoad); if (cameraTimer !== undefined) clearTimeout(cameraTimer);
      for (const remove of listeners.reverse()) remove();cueQA.destroy();helpOffers.destroy();platform.ads.setRewardedDemand(false); transition.destroy(); adSurface.destroy(); settingsSurface.destroy(); meta.destroy(); motion.destroy(); platform.activity.setBlocked('menu', false);
      dialog.close(); platform.activity.setBlocked('dialog', false); platform.activity.setBlocked('save-load', false); content.replaceChildren();
      // The final accepted write is allowed to settle; no later receipt can mutate a disposed store.
      void progress.flush().finally(() => progress.destroy());
    },
  };
}
