"use client"

import * as React from "react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { BriefTemplate, Provider, DIDType, DisplayBriefTemplate } from "@/types/database"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

export default function AdminPage(): React.ReactElement {
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [providers, setProviders] = React.useState<Provider[]>([])
  const [briefTemplates, setBriefTemplates] = React.useState<DisplayBriefTemplate[]>([])
  const [showTemplateUpload, setShowTemplateUpload] = React.useState(false)
  const [isUploading, setIsUploading] = React.useState(false)
  const [didTypes, setDidTypes] = React.useState<DIDType[]>([])
  const [storageFiles, setStorageFiles] = React.useState<string[]>([])
  const [isStorageLoading, setIsStorageLoading] = React.useState(false)
  const [selectedProvider, setSelectedProvider] = React.useState<string>("")
  const [selectedDIDType, setSelectedDIDType] = React.useState<string>("")
  const [templateName, setTemplateName] = React.useState<string>("")
  const [templateDescription, setTemplateDescription] = React.useState<string>("")
  const [templateFile, setTemplateFile] = React.useState<File | null>(null)

  const fetchData = React.useCallback(async () => {
    try {
      console.log('Starting to fetch data...');
      setLoading(true)
      setError(null)

      // Fetch all providers first
      console.log('Fetching providers...');
      const { data: providersData, error: providersError } = await supabase
        .from('provider')
        .select('providerid, provider_name')
        .order('provider_name');

      if (providersError) {
        console.error('Error fetching providers:', {
          message: providersError.message,
          details: providersError.details,
          hint: providersError.hint
        });
        throw new Error(`Failed to fetch providers: ${providersError.message}`);
      }

      console.log('Providers fetched successfully:', providersData);

      // Set providers state with partial provider data (we only need id and name for the dropdown)
      if (providersData) {
        const partialProviders: Pick<Provider, 'providerid' | 'provider_name'>[] = providersData.map(p => ({
          providerid: p.providerid as number,
          provider_name: p.provider_name as string
        }));
        setProviders(partialProviders as Provider[]);
      }

      // Fetch all DID types
      const { data: didTypesData, error: didTypesError } = await supabase
        .from('did_type')
        .select('id, did_type')
        .order('did_type');

      if (didTypesError) {
        console.error('Error fetching DID types:', {
          message: didTypesError.message,
          details: didTypesError.details,
          hint: didTypesError.hint
        });
        throw new Error(`Failed to fetch DID types: ${didTypesError.message}`);
      }

      // Set DID types state
      if (didTypesData) {
        setDidTypes(didTypesData.map(d => ({
          id: d.id as number,
          did_type: d.did_type as string
        })));
      }

      // Fetch brief templates
      const { data: briefTemplatesData, error: briefTemplatesError } = await supabase
        .from('brief_templates')
        .select(`
          id,
          template_name,
          provider_id,
          did_type,
          template_file_path,
          template_text,
          template_format,
          created_at,
          updated_at
        `)
        .order('updated_at', { ascending: false });

      if (briefTemplatesError) {
        console.error('Error fetching brief templates:', briefTemplatesError);
        throw new Error(`Failed to fetch brief templates: ${briefTemplatesError.message}`);
      }

      if (briefTemplatesData && briefTemplatesData.length > 0) {
        try {
          // Create lookup maps using the already fetched data
          const providerMap = new Map(
            providersData?.map(p => [p.providerid, p.provider_name as string]) || []
          );
          const didTypeMap = new Map(
            didTypesData?.map(d => [d.id, d.did_type as string]) || []
          );

          // Map the data with type assertions
          const templates: DisplayBriefTemplate[] = briefTemplatesData.map(template => ({
            id: template.id as number,
            template_name: template.template_name as string,
            provider_id: template.provider_id as number,
            did_type: template.did_type as number,
            template_file_path: template.template_file_path as string,
            template_text: template.template_text as string,
            template_format: template.template_format as BriefTemplate['template_format'],
            created_at: (template.created_at as string) || '',
            updated_at: (template.updated_at as string) || '',
            provider: {
              provider_name: providerMap.get(template.provider_id as number) || 'Unknown Provider'
            },
            did_type_display: {
              did_type: didTypeMap.get(template.did_type as number) || 'Unknown Type'
            }
          }));

          setBriefTemplates(templates);
        } catch (err) {
          console.error('Error processing template data:', err);
          setBriefTemplates([]);
        }
      } else {
        setBriefTemplates([]);
      }

    } catch (error) {
      console.error('Error in fetchData:', error)
      setError(error instanceof Error ? error.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [])

  const listStorageContents = async () => {
    try {
      setIsStorageLoading(true);
      console.log('Listing storage contents...');
      
      // List contents of the bucket
      const { data, error } = await supabase.storage
        .from('brief-templates')
        .list();
      
      if (error) {
        console.error('Error listing storage:', error);
        toast.error('Failed to list storage contents');
        return;
      }
      
      console.log('Storage contents:', data);
      if (!data || data.length === 0) {
        console.log('No files found in storage');
        setStorageFiles([]);
      } else {
        // Filter out the .emptyFolderPlaceholder file
        const files = data
          .filter(file => file.name !== '.emptyFolderPlaceholder')
          .map(file => file.name);
        setStorageFiles(files);
      }
    } catch (error) {
      console.error('Error listing storage:', error);
      toast.error('Failed to list storage contents');
    } finally {
      setIsStorageLoading(false);
    }
  };

  const handleStorageFileDelete = async (fileName: string) => {
    try {
      const { error } = await supabase.storage
        .from('brief-templates')
        .remove([fileName]);

      if (error) {
        console.error('Error deleting file:', error);
        toast.error('Failed to delete file');
        return;
      }

      toast.success('File deleted successfully');
      listStorageContents(); // Refresh the list
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error('Failed to delete file');
    }
  };

  // Add useEffect to fetch data on component mount
  React.useEffect(() => {
    console.log('AdminPage mounted, calling fetchData...');
    fetchData();
    // Call listStorageContents after a short delay to ensure auth is ready
    setTimeout(() => {
      listStorageContents();
    }, 1000);
  }, [fetchData]);

  const downloadTemplate = async (templateId: number) => {
    try {
      // First get the template file path
      const { data: template, error: templateError } = await supabase
        .from('brief_templates')
        .select('template_file_path, template_name')
        .eq('id', templateId)
        .single();

      if (templateError) {
        console.error('Error fetching template:', templateError);
        throw new Error(`Failed to fetch template: ${templateError.message}`);
      }

      if (!template?.template_file_path) {
        throw new Error('Template file path is missing');
      }

      // Download the file from storage
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('brief-templates')
        .download(template.template_file_path as string);

      if (downloadError) {
        console.error('Error downloading template:', downloadError);
        throw new Error('Failed to download template file');
      }

      // Create blob and trigger download
      const blob = new Blob([fileData], { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${template.template_name}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Template downloaded successfully');
    } catch (error) {
      console.error('Error downloading template:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to download template');
    }
  };

  const deleteTemplate = async (templateId: number) => {
    try {
      const { error } = await supabase
        .from('brief_templates')
        .delete()
        .eq('id', templateId)

      if (error) throw error

      toast.success('Template deleted successfully')
      fetchData()
    } catch (error) {
      console.error('Error deleting template:', error)
      toast.error('Failed to delete template')
    }
  }

  const handleTemplateUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log('handleTemplateUpload called');
    
    try {
      // Check authentication status
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      if (authError || !session) {
        console.error('Authentication error:', authError);
        toast.error('You must be authenticated to upload templates');
        return;
      }

      setIsUploading(true);
      
      // Log all values for debugging
      console.log('Form values:', {
        templateName,
        selectedProvider,
        selectedDIDType,
        templateFile,
        templateDescription
      });

      // Validate required fields
      if (!templateFile || !templateName || !selectedProvider || !selectedDIDType) {
        const missing = [];
        if (!templateFile) missing.push('Template file');
        if (!templateName) missing.push('Template name');
        if (!selectedProvider) missing.push('Provider');
        if (!selectedDIDType) missing.push('DID type');
        const errorMsg = `Missing required fields: ${missing.join(', ')}`;
        console.error(errorMsg);
        toast.error(errorMsg);
        return;
      }

      // Validate file type
      if (!templateFile.name.toLowerCase().endsWith('.docx')) {
        toast.error('Only DOCX files are supported');
        return;
      }

      // Create a unique filename
      const provider = providers.find(p => p.providerid.toString() === selectedProvider);
      const sanitizedProviderName = provider?.provider_name?.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'unknown';
      const sanitizedTemplateName = templateName.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const fileName = `${sanitizedProviderName}-${sanitizedTemplateName}-${Date.now()}.docx`;

      console.log('Uploading file:', {
        fileName,
        fileSize: templateFile.size,
        provider: provider?.provider_name,
        templateName
      });

      // Upload file to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('brief-templates')
        .upload(fileName, templateFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast.error(`Failed to upload file: ${uploadError.message}`);
        return;
      }

      console.log('File uploaded successfully:', uploadData);

      // Create template metadata
      const templateMetadata = {
        template_name: templateName,
        provider_id: parseInt(selectedProvider),
        did_type: parseInt(selectedDIDType),
        template_file_path: fileName,
        template_text: '',
        template_format: {
          placeholders: [
            'did', 'sender', 'provider', 'use_case', 'campaign_id',
            'status', 'submitted_date', 'notes', 'sample1', 'sample2',
            'sample3', 'date'
          ],
          version: '1.0',
          metadata: {
            description: templateDescription || undefined,
            created_by: session.user.email,
            last_modified: new Date().toISOString()
          }
        }
      };

      console.log('Creating template record:', templateMetadata);

      // Create record in brief_templates table
      const { data: insertData, error: insertError } = await supabase
        .from('brief_templates')
        .insert(templateMetadata)
        .select();

      if (insertError) {
        console.error('Database error:', insertError);
        // Clean up the uploaded file
        await supabase.storage
          .from('brief-templates')
          .remove([fileName]);
        toast.error(`Failed to create template record: ${insertError.message}`);
        return;
      }

      console.log('Template record created:', insertData);
      toast.success('Template uploaded successfully');
      
      // Reset form
      setTemplateName("");
      setSelectedProvider("");
      setSelectedDIDType("");
      setTemplateFile(null);
      setTemplateDescription("");
      setShowTemplateUpload(false);
      
      // Refresh both the template list and storage contents
      await fetchData();
      await listStorageContents();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload template');
    } finally {
      setIsUploading(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>
  }

  if (error) {
    return <div className="text-red-500">Error: {error}</div>
  }

  return (
    <div className="container mx-auto py-10 space-y-8">
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Brief Templates</h2>
        <div className="flex justify-end">
          <Button onClick={() => setShowTemplateUpload(!showTemplateUpload)}>
            {showTemplateUpload ? "Cancel Upload" : "Upload New Template"}
          </Button>
        </div>

        {showTemplateUpload && (
          <form 
            onSubmit={handleTemplateUpload} 
            className="border p-4 rounded-lg space-y-4"
          >
            <div className="space-y-2">
              <Label>Template Name</Label>
              <Input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Enter template name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Provider</Label>
              <Select 
                value={selectedProvider} 
                onValueChange={setSelectedProvider}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  {providers.map((provider) => (
                    <SelectItem 
                      key={provider.providerid} 
                      value={provider.providerid.toString()}
                    >
                      {provider.provider_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>DID Type</Label>
              <Select 
                value={selectedDIDType} 
                onValueChange={setSelectedDIDType}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select DID type" />
                </SelectTrigger>
                <SelectContent>
                  {didTypes.map((type) => (
                    <SelectItem 
                      key={type.id} 
                      value={type.id.toString()}
                    >
                      {type.did_type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Template File (DOCX)</Label>
              <Input
                type="file"
                onChange={(e) => setTemplateFile(e.target.files?.[0] || null)}
                accept=".docx"
                required
              />
              <p className="text-sm text-gray-500">Only DOCX files are supported</p>
            </div>

            <div className="space-y-2">
              <Label>Template Description</Label>
              <Textarea
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                placeholder="Enter a description for this template"
              />
            </div>

            <Button type="submit" disabled={isUploading}>
              {isUploading ? "Uploading..." : "Upload Template"}
            </Button>
          </form>
        )}

        <div className="grid gap-4">
          {briefTemplates.map((template) => (
            <div key={template.id} className="border p-4 rounded-lg">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium">{template.template_name}</h3>
                  <p className="text-sm text-gray-500">
                    Provider: {template.provider.provider_name} | 
                    DID Type: {template.did_type_display.did_type}
                  </p>
                  {template.template_format?.metadata?.description && (
                    <p className="text-sm mt-2">{template.template_format.metadata.description}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    File: {template.template_file_path}
                  </p>
                </div>
                <div className="space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => downloadTemplate(template.id)}
                  >
                    Download
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => deleteTemplate(template.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Storage Contents</h2>
        <div className="space-y-2">
          {isStorageLoading ? (
            <div className="text-center py-4">Loading storage contents...</div>
          ) : storageFiles.length === 0 ? (
            <div className="text-center py-4 text-gray-500">No files in storage</div>
          ) : (
            storageFiles.map((fileName) => {
              // Find the template that uses this file
              const associatedTemplate = briefTemplates.find(
                template => template.template_file_path === fileName
              );

              return (
                <div key={fileName} className="flex items-center justify-between p-4 bg-gray-50 rounded">
                  <div>
                    <span className="font-medium">{fileName}</span>
                    {associatedTemplate && (
                      <p className="text-sm text-gray-500">
                        Used by: {associatedTemplate.template_name} ({associatedTemplate.provider.provider_name})
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const url = supabase.storage
                          .from('brief-templates')
                          .getPublicUrl(fileName).data.publicUrl;
                        window.open(url, '_blank');
                      }}
                    >
                      View
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleStorageFileDelete(fileName)}
                      disabled={!!associatedTemplate}
                      title={associatedTemplate ? "Cannot delete file in use by a template" : "Delete file"}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  )
}
