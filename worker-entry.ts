import app from "./apps/web/worker.js";
import { runScheduledBookingCompletion } from "./apps/web/src/lib/server/booking-completion-job";

type AppWorker = {
  fetch: (
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ) => Promise<Response>;
};

const svelteWorker = app as AppWorker;

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    return svelteWorker.fetch(request, env, ctx);
  },
  scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(
      (async () => {
        const result = await runScheduledBookingCompletion(
          env,
          controller.scheduledTime,
        );

        console.info(
          JSON.stringify({
            event: "booking_completion_job",
            cron: controller.cron,
            scheduledTime: new Date(controller.scheduledTime).toISOString(),
            completedCount: result.count,
          }),
        );
      })(),
    );
  },
};
