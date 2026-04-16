export interface CameraTemplate {
  id: string;
  label: string;
  prompt: string;
}

export interface MotionTemplate {
  id: string;
  label: string;
  prompt: string;
}

export interface SceneTemplate {
  id: string;
  label: string;
  prompt: string;
}

export const CAMERA_TEMPLATES: CameraTemplate[] = [
  { id: 'front_full', label: '正面全身', prompt: 'front full-body shot, eye-level angle, centered composition' },
  { id: 'angle45_full', label: '45°全身', prompt: '45-degree full-body shot, slightly angled pose, elegant composition' },
  { id: 'half_body', label: '半身近景', prompt: 'medium close-up shot from waist up, soft focus background' },
  { id: 'side_walk', label: '侧身走步', prompt: 'side-angle walking shot, dynamic stride, full body visible' },
  { id: 'detail_close', label: '细节特写', prompt: 'close-up detail shot focusing on outfit textures and accessories' },
];

export const MOTION_TEMPLATES: MotionTemplate[] = [
  { id: 'stand_sway', label: '站立轻摆', prompt: 'standing with subtle body sway, gentle weight shift' },
  { id: 'step_forward', label: '向前一步', prompt: 'taking one graceful step forward, natural stride' },
  { id: 'slow_turn', label: '缓慢转身', prompt: 'slowly turning around to showcase the outfit from all angles' },
  { id: 'adjust_collar', label: '抬手整理衣领', prompt: 'gently raising hand to adjust collar, elegant gesture' },
  { id: 'bag_turn', label: '提包转头', prompt: 'holding a bag while turning head with a slight smile' },
  { id: 'skirt_sway', label: '裙摆轻晃', prompt: 'light skirt swaying naturally with gentle movement' },
  { id: 'smile_camera', label: '微笑看镜头', prompt: 'looking at camera with a soft natural smile, minimal movement' },
];

export const SCENE_TEMPLATES: SceneTemplate[] = [
  { id: 'solid_bg', label: '简洁纯色背景', prompt: 'clean solid color background, studio lighting' },
  { id: 'minimal_studio', label: '极简摄影棚', prompt: 'minimalist photography studio, soft diffused lighting' },
  { id: 'mall_corridor', label: '商场通道', prompt: 'modern shopping mall corridor, ambient lighting' },
  { id: 'cafe_exterior', label: '咖啡店外立面', prompt: 'charming cafe exterior, warm natural lighting' },
  { id: 'street_wall', label: '街拍风墙面', prompt: 'urban street wall backdrop, natural daylight, street fashion style' },
  { id: 'luxury_interior', label: '轻奢店内', prompt: 'luxury boutique interior, warm ambient lighting, elegant atmosphere' },
];

export function findCamera(id: string): CameraTemplate | undefined {
  return CAMERA_TEMPLATES.find((t) => t.id === id);
}

export function findMotion(id: string): MotionTemplate | undefined {
  return MOTION_TEMPLATES.find((t) => t.id === id);
}

export function findScene(id: string): SceneTemplate | undefined {
  return SCENE_TEMPLATES.find((t) => t.id === id);
}
