const GetEvent = {"body":{"properties":{"rule":{"type":"string"},"rule_action":{"type":"string"}},"type":"object","required":["rule"],"$schema":"http://json-schema.org/draft-04/schema#"}} as const
;
const GetRulesId = {"metadata":{"allOf":[{"type":"object","properties":{"id":{"type":"string","$schema":"http://json-schema.org/draft-04/schema#"}},"required":["id"]}]}} as const
;
const PostEvents = {"body":{"properties":{"rule":{"type":"string"},"rule_action":{"type":"string"}},"type":"object","required":["rule"],"$schema":"http://json-schema.org/draft-04/schema#"}} as const
;
const PostPutEvent = {"body":{"properties":{"event":{"type":"string"}},"type":"object","required":["event"],"$schema":"http://json-schema.org/draft-04/schema#"}} as const
;
const PostWorkflow = {"body":{"properties":{"name":{"type":"string"},"handle":{"type":"string"},"workflow_definition":{"type":"string","description":"Base64 encoded version of workflow YAML definition"}},"type":"object","required":["name","handle","workflow_definition"],"$schema":"http://json-schema.org/draft-04/schema#"}} as const
;
export { GetEvent, GetRulesId, PostEvents, PostPutEvent, PostWorkflow }
