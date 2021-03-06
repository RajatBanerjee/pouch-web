import React, { useState } from 'react';
import { API, Auth, Storage } from 'aws-amplify';
import { withRouter } from "react-router-dom";
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/FileDownload';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import Box from '@mui/material/Box';
import DialogTitle from '@mui/material/DialogTitle';
import Button from '@mui/material/Button';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import Title from './Title';


function Files(props) {
  const [rows, setFiles] = useState([]);
  const [dataToBeDeleted, setDataToBeDeleted] = useState({});
  const [open, setOpen] = useState(false);
  const [openAlert, setOpenAlert] = useState(false);

  const handleCloseAlert = () => {
    setOpenAlert(false);
  };

  const handleDeleteClick = async () => {
    var done = await Storage.remove(dataToBeDeleted.row.fileName, { level: 'private' })
    const myInit = {
      headers: {
        Authorization: `Bearer ${(await Auth.currentSession()).getIdToken().getJwtToken()}`,
      },
    };
    try {
      var dbData = await API.del("pouch-api", "/userdata/" + dataToBeDeleted.row.id, myInit)
      setOpen(false);
      setOpenAlert(true)
      window.location.reload();
    }
    catch(err) {

    }

  }

  const deleteFile = React.useCallback(
    (data) => async () => {
      setDataToBeDeleted(data)
      setOpen(true);
    },
    [],
  );

  const downloadFile = React.useCallback(
    (data) => async () => {
      const result = await Storage.get(data.row.fileName, { level: 'private', download: true }) // for listing ALL files without prefix, pass '' instead
      downloadBlob(result.Body, data.row.fileName);
    }, []);
  const columns = React.useMemo(
    () => [
      { field: 'id', headerName: 'Id', width: 100 },
      { field: 'fileName', headerName: 'File Name', width: 200 },
      { field: 'insTs', headerName: 'Uploaded', width: 200 },
      { field: 'updTs', headerName: 'Last Updated', width: 200 },
      { field: 'fileSize', headerName: 'Size', width: 200 },
      {
        field: 'actions',
        type: 'actions',
        width: 80,
        getActions: (params) => [
          <GridActionsCellItem
            icon={<DeleteIcon />}
            label="Delete"
            onClick={deleteFile(params)} />,
          <GridActionsCellItem
            icon={<DownloadIcon />}
            label="Download"
            onClick={downloadFile(params)}
          />,
        ],
      },
    ],
    [deleteFile, downloadFile],
  );
  const handleClose = () => {
    setOpen(false);
  };
  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'download';
    const clickHandler = () => {
      setTimeout(() => {
        URL.revokeObjectURL(url);
        a.removeEventListener('click', clickHandler);
      }, 150);
    };
    a.addEventListener('click', clickHandler, false);
    a.click();
    return a;
  }

  React.useEffect(() => {
    getFiles(props)
  }, []);


  const getFiles = async (props) => {
    const myInit = {
      headers: {
        Authorization: `Bearer ${(await Auth.currentSession()).getIdToken().getJwtToken()}`,
      },
    };
    var query = "?id=" + props.user.attributes.sub
    try {
      var dbData = await API.get("pouch-api", "/userdata" + query, myInit)
      console.log("db data ==>", dbData)
    } catch (err) {
      console.error(err)
    }
    if (dbData) {

      try {
        var result = await Storage.list('', { level: 'private' }) // for listing ALL files without prefix, pass '' instead
        console.log("result ==>", result)
      } catch (err) {
        console.error(err)
      }

      if (result) {
        dbData.map(d => {
          let f = result.find((r) => { return r.key.indexOf(d.fileName) > 0 || d.fileName == r.key })
          d.fileSize = f.size
          return d
        })
      }
      setFiles(dbData)
    }

  }

  return (
    <React.Fragment>
      <Title>Your Files</Title>
      <div style={{ height: 400, width: '100%' }}>
        <DataGrid
          rows={rows}
          columns={columns}
          pageSize={5}
          rowsPerPageOptions={[5]}
          disableSelectionOnClick
        />
      </div>
      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>Delete File</DialogTitle>
        <DialogContent>
          {/*  */}
          <Box sx={{ width: 500, height: 100, }}>
            Are you sure you want to delete this file
          </Box>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" color="error" onClick={handleDeleteClick}>Delete</Button>
        </DialogActions>
      </Dialog>
      <Snackbar open={openAlert} autoHideDuration={6000} onClose={handleCloseAlert}>
        <Alert onClose={handleCloseAlert} severity="success" sx={{ width: '100%' }}>
         File was deleted successfully
        </Alert>
      </Snackbar>
    </React.Fragment>
  );
}

export default withRouter(Files)