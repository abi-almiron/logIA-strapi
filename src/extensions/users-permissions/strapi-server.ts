type PluginConUsuario = {
  contentTypes: {
    user: {
      schema: {
        attributes: Record<string, unknown>;
      };
    };
  };
};

export default (plugin: PluginConUsuario) => {
  plugin.contentTypes.user.schema.attributes.grupo = {
    type: 'relation',
    relation: 'manyToOne',
    target: 'api::grupo.grupo',
  };

  return plugin;
};
