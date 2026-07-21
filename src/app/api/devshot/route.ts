import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

/**
 * DEV-ONLY. Receives a rendered frame as a data URL and writes it to
 * .devshots/ so it can be inspected off-browser.
 *
 * Why this exists: the R3F scene only draws inside requestAnimationFrame, which
 * never fires while the tab is hidden — an automated browser pane therefore
 * renders zero frames and screenshots time out. The workaround is to drive
 * gl.render() manually and read the buffer back with toDataURL() in the SAME
 * task (there is no preserveDrawingBuffer, so the buffer dies at composite).
 * That yields a data URL inside the page, and this route is how it gets out.
 *
 * Do NOT put an underscore in front of the folder name: the App Router treats
 * `_`-prefixed folders as private and will not route them, which is a 404 that
 * looks exactly like a broken handler.
 *
 * Remove this route, plus window.__r3f and window.__wallTex, before shipping.
 */
export async function POST(req: Request) {
  if (process.env.NODE_ENV === 'production') {
    return new Response('gone', { status: 404 });
  }
  const { name, data } = await req.json();
  const b64 = String(data).replace(/^data:image\/\w+;base64,/, '');
  const safe = String(name).replace(/[^a-z0-9._-]/gi, '_');
  const dir = path.join(process.cwd(), '.devshots');
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, safe);
  await writeFile(file, Buffer.from(b64, 'base64'));
  return Response.json({ ok: true, file });
}
