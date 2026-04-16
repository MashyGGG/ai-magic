"use client";

import { useEffect } from "react";
import { Drawer, Form, Input, Button, Select, Upload, App } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  CAMERA_TEMPLATES,
  MOTION_TEMPLATES,
  SCENE_TEMPLATES,
} from "@ai-magic/prompts";

interface Props {
  open: boolean;
  editId: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function TemplateFormDrawer({
  open,
  editId,
  onClose,
  onSuccess,
}: Props) {
  const [form] = Form.useForm();
  const { message } = App.useApp();

  const { data: editData } = useQuery({
    queryKey: ["template", editId],
    queryFn: async () => {
      if (!editId) return null;
      const res = await fetch(`/api/character-templates/${editId}`);
      const json = await res.json();
      return json.data;
    },
    enabled: !!editId && open,
  });

  useEffect(() => {
    if (editData) {
      form.setFieldsValue(editData);
    } else {
      form.resetFields();
    }
  }, [editData, form, open]);

  const saveMutation = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      const url = editId
        ? `/api/character-templates/${editId}`
        : "/api/character-templates";
      const method = editId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      return res.json();
    },
    onSuccess: (res) => {
      if (res.success) {
        message.success(editId ? "更新成功" : "创建成功");
        onSuccess();
      } else {
        message.error(res.error?.message || "操作失败");
      }
    },
  });

  const handleUpload = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    const json = await res.json();
    if (json.success) {
      form.setFieldValue("referenceAssetId", json.data.assetId);
      message.success("参考图上传成功");
    } else {
      message.error("上传失败");
    }
    return false;
  };

  return (
    <Drawer
      title={editId ? "编辑角色模板" : "新建角色模板"}
      open={open}
      onClose={onClose}
      size="large"
      // Keep Drawer content mounted to avoid AntD warning:
      // "Instance created by useForm is not connected to any Form element."
      forceRender
      destroyOnClose={false}
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>取消</Button>
          <Button
            type="primary"
            loading={saveMutation.isPending}
            onClick={() => form.submit()}
          >
            保存
          </Button>
        </div>
      }
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={(values) => saveMutation.mutate(values)}
      >
        <Form.Item
          name="name"
          label="模板名称"
          rules={[{ required: true, message: "请输入模板名称" }]}
        >
          <Input placeholder="例：都市轻奢女模特A" />
        </Form.Item>
        <Form.Item name="description" label="描述">
          <Input.TextArea rows={2} placeholder="模板用途描述" />
        </Form.Item>

        <div className="grid grid-cols-2 gap-x-4">
          <Form.Item name="genderStyle" label="性别风格">
            <Select
              placeholder="选择"
              allowClear
              options={[
                { value: "female", label: "女性" },
                { value: "male", label: "男性" },
                { value: "unisex", label: "中性" },
              ]}
            />
          </Form.Item>
          <Form.Item name="ageStyle" label="年龄感">
            <Input placeholder="例：25-30" />
          </Form.Item>
        </div>

        <Form.Item name="faceDesc" label="脸型描述">
          <Input placeholder="例：鹅蛋脸，五官立体" />
        </Form.Item>
        <Form.Item name="hairDesc" label="发型描述">
          <Input placeholder="例：黑长直" />
        </Form.Item>
        <Form.Item name="skinDesc" label="肤色描述">
          <Input placeholder="例：自然白皙" />
        </Form.Item>
        <Form.Item name="bodyDesc" label="身材描述">
          <Input placeholder="例：高挑匀称" />
        </Form.Item>
        <Form.Item name="vibeDesc" label="气质风格">
          <Input placeholder="例：轻奢都市感" />
        </Form.Item>

        <div className="grid grid-cols-2 gap-x-4">
          <Form.Item name="defaultCamera" label="默认镜头">
            <Select
              placeholder="选择"
              allowClear
              options={CAMERA_TEMPLATES.map((c) => ({
                value: c.id,
                label: c.label,
              }))}
            />
          </Form.Item>
          <Form.Item name="defaultMotion" label="默认动作">
            <Select
              placeholder="选择"
              allowClear
              options={MOTION_TEMPLATES.map((m) => ({
                value: m.id,
                label: m.label,
              }))}
            />
          </Form.Item>
        </div>

        <Form.Item name="defaultScene" label="默认场景">
          <Select
            placeholder="选择"
            allowClear
            options={SCENE_TEMPLATES.map((s) => ({
              value: s.id,
              label: s.label,
            }))}
          />
        </Form.Item>

        <Form.Item label="参考图">
          <Upload
            accept="image/*"
            maxCount={1}
            beforeUpload={handleUpload}
            showUploadList={false}
          >
            <Button icon={<UploadOutlined />}>上传参考图 (≤10MB)</Button>
          </Upload>
          <Form.Item name="referenceAssetId" hidden>
            <Input />
          </Form.Item>
        </Form.Item>
      </Form>
    </Drawer>
  );
}
